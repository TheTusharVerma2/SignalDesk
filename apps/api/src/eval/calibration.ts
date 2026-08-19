import { eq, sql } from "drizzle-orm";
import { db } from "../db/client.js";
import {
    agentDecisions,
    calibrationSnapshots,
    humanCorrections
} from "../db/schema.js";

export type BucketMetric = {
    bucket: string;
    predictedAccuracy: number;
    actualAccuracy: number;
    sampleSize: number;
};

const BUCKETS = [
    { label: "0.0-0.2", min: 0.0, max: 0.2 },
    { label: "0.2-0.4", min: 0.2, max: 0.4 },
    { label: "0.4-0.6", min: 0.4, max: 0.6 },
    { label: "0.6-0.8", min: 0.6, max: 0.8 },
    { label: "0.8-1.0", min: 0.8, max: 1.01 }
];

export async function runCalibrationSnapshot() {
    // Join agent decisions with human corrections ground truth
    const rows = await db
        .select({
            decisionId: agentDecisions.id,
            category: agentDecisions.category,
            confidence: agentDecisions.confidence,
            wasCategoryCorrect: humanCorrections.wasCategoryCorrect,
            wasResponseCorrect: humanCorrections.wasResponseCorrect,
            correctedCategory: humanCorrections.correctedCategory
        })
        .from(agentDecisions)
        .innerJoin(
            humanCorrections,
            eq(agentDecisions.id, humanCorrections.decisionId)
        );

    if (rows.length === 0) {
        return {
            snapshots: [],
            ece: 0,
            totalReviewed: 0,
            overallAccuracy: 0
        };
    }

    const bucketMetrics: BucketMetric[] = [];
    let totalWeightedError = 0;
    let totalCorrect = 0;

    for (const b of BUCKETS) {
        const inBucket = rows.filter((r) => {
            const conf = Number(r.confidence);
            return conf >= b.min && conf < b.max;
        });

        if (inBucket.length === 0) {
            bucketMetrics.push({
                bucket: b.label,
                predictedAccuracy: (b.min + Math.min(b.max, 1.0)) / 2,
                actualAccuracy: 0,
                sampleSize: 0
            });
            continue;
        }

        const avgConfidence =
            inBucket.reduce((acc, r) => acc + Number(r.confidence), 0) / inBucket.length;

        const correctCount = inBucket.filter(
            (r) => r.wasCategoryCorrect && r.wasResponseCorrect
        ).length;

        totalCorrect += correctCount;
        const actualAcc = correctCount / inBucket.length;

        totalWeightedError += Math.abs(avgConfidence - actualAcc) * inBucket.length;

        bucketMetrics.push({
            bucket: b.label,
            predictedAccuracy: Math.round(avgConfidence * 1000) / 1000,
            actualAccuracy: Math.round(actualAcc * 1000) / 1000,
            sampleSize: inBucket.length
        });
    }

    const ece = Math.round((totalWeightedError / rows.length) * 1000) / 1000;
    const overallAccuracy = Math.round((totalCorrect / rows.length) * 1000) / 1000;

    // Insert computed bucket records into calibration_snapshots table
    const insertedSnapshots = await db
        .insert(calibrationSnapshots)
        .values(
            bucketMetrics.map((bm) => ({
                confidenceBucket: bm.bucket,
                predictedAccuracy: String(bm.predictedAccuracy),
                actualAccuracy: String(bm.actualAccuracy),
                sampleSize: bm.sampleSize
            }))
        )
        .returning();

    return {
        snapshots: insertedSnapshots,
        ece,
        totalReviewed: rows.length,
        overallAccuracy
    };
}

export async function getEvaluationMetrics() {
    const rows = await db
        .select({
            decisionCategory: agentDecisions.category,
            confidence: agentDecisions.confidence,
            wasCategoryCorrect: humanCorrections.wasCategoryCorrect,
            wasResponseCorrect: humanCorrections.wasResponseCorrect,
            correctedCategory: humanCorrections.correctedCategory
        })
        .from(agentDecisions)
        .innerJoin(
            humanCorrections,
            eq(agentDecisions.id, humanCorrections.decisionId)
        );

    // Latest calibration snapshots
    const latestSnapshots = await db
        .select()
        .from(calibrationSnapshots)
        .orderBy(sql`${calibrationSnapshots.computedAt} DESC`)
        .limit(5);

    // Category Drift calculation: AI predicted vs Human Corrected
    const categoryCounts: Record<string, { aiCount: number; humanCount: number }> = {};

    for (const r of rows) {
        const aiCat = r.decisionCategory;
        const finalCat = r.wasCategoryCorrect
            ? r.decisionCategory
            : r.correctedCategory || r.decisionCategory;

        if (!categoryCounts[aiCat]) {
            categoryCounts[aiCat] = { aiCount: 0, humanCount: 0 };
        }
        categoryCounts[aiCat].aiCount += 1;

        if (!categoryCounts[finalCat]) {
            categoryCounts[finalCat] = { aiCount: 0, humanCount: 0 };
        }
        categoryCounts[finalCat].humanCount += 1;
    }

    const categoryDrift = Object.entries(categoryCounts).map(([category, counts]) => ({
        category,
        aiCount: counts.aiCount,
        humanCount: counts.humanCount
    }));

    const totalCorrect = rows.filter(
        (r) => r.wasCategoryCorrect && r.wasResponseCorrect
    ).length;

    const totalReviewed = rows.length;
    const overallAccuracy =
        totalReviewed > 0 ? Math.round((totalCorrect / totalReviewed) * 1000) / 1000 : 0;

    return {
        snapshots: latestSnapshots,
        totalReviewed,
        overallAccuracy,
        categoryDrift
    };
}
