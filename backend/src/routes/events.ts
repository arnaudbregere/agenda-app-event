import { createTypedRouter } from "./typedRouter.js";
import { withBody } from "../middleware/validateBody.js";
import { parseEventBody, parseEventPatch } from "../utils/validators.js";
import { requireEvent } from "../middleware/requireEvent.js";
import {
  getEvents,
  getEventById,
  postEvent,
  putEvent,
  deleteEventById,
} from "../controllers/eventsController.js";

const api = createTypedRouter();

api.get("/", getEvents);
api.get("/:id", getEventById);
api.post("/", withBody(parseEventBody, postEvent));
api.put("/:id", requireEvent, withBody(parseEventPatch, putEvent));
api.delete("/:id", deleteEventById);

export default api.router;
