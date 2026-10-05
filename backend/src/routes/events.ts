import { createTypedRouter } from "./typedRouter.js";
import { withBody } from "../middleware/validateBody.js";
import { parseEventBody, parseEventPatch } from "../utils/validators.js";
import { parseIcsBody } from "../utils/ical.js";
import { requireEvent } from "../middleware/requireEvent.js";
import {
  getEvents,
  getEventById,
  postEvent,
  putEvent,
  deleteEventById,
  exportEvents,
  importEvents,
} from "../controllers/eventsController.js";

const api = createTypedRouter();

api.get("/", getEvents);
// Avant /:id : sinon "export" serait lu comme un identifiant.
api.get("/export", exportEvents);
api.get("/:id", getEventById);
api.post("/import", withBody(parseIcsBody, importEvents));
api.post("/", withBody(parseEventBody, postEvent));
api.put("/:id", requireEvent, withBody(parseEventPatch, putEvent));
api.delete("/:id", deleteEventById);

export default api.router;
