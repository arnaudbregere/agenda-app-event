import { Router } from "express";
import {
  getEvents,
  getEventById,
  postEvent,
  putEvent,
  deleteEventById,
} from "../controllers/eventsController.js";

const router = Router();

router.get("/", getEvents);
router.get("/:id", getEventById);
router.post("/", postEvent);
router.put("/:id", putEvent);
router.delete("/:id", deleteEventById);

export default router;
