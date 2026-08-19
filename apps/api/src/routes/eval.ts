import { Router } from "express";
import { getEvaluationMetrics, runCalibrationSnapshot } from "../eval/calibration.js";

const router = Router();

// Triggers a new calibration snapshot calculation and returns the results
router.post("/calibrate", async (_request, response, next) => {
    try {
        const result = await runCalibrationSnapshot();
        response.status(201).json(result);
    } catch (error) {
        next(error);
    }
});

// Returns the latest evaluation metrics, ECE, calibration snapshot, and category drift
router.get("/metrics", async (_request, response, next) => {
    try {
        const metrics = await getEvaluationMetrics();
        response.json(metrics);
    } catch (error) {
        next(error);
    }
});

export default router;
