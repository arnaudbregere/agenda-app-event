import { createTypedRouter } from "./typedRouter.js";
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
api.post("/", postEvent);
api.put("/:id", putEvent);
api.delete("/:id", deleteEventById);

export default api.router;
