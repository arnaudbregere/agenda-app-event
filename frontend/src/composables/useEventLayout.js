// Calcule la position (colonne / largeur) des événements chronométrés qui se
// chevauchent dans une même journée, pour la vue Semaine/Jour.
// Algorithme classique : on regroupe les événements qui se chevauchent en
// "clusters", puis on leur attribue des colonnes gloutonnement.
export function layoutTimedEvents(events) {
  const sorted = [...events].sort(
    (a, b) => a.startMinutes - b.startMinutes || b.endMinutes - a.endMinutes
  );

  const result = [];
  let cluster = [];
  let clusterEnd = -Infinity;

  const flush = () => {
    if (!cluster.length) return;
    const columns = []; // columns[i] = dernier événement placé dans la colonne i

    for (const ev of cluster) {
      let placedIn = columns.findIndex((col) => col.endMinutes <= ev.startMinutes);
      if (placedIn === -1) {
        placedIn = columns.length;
      }
      columns[placedIn] = ev;
      ev._col = placedIn;
    }

    const totalColumns = columns.length;
    for (const ev of cluster) {
      result.push({
        ...ev,
        left: (ev._col / totalColumns) * 100,
        width: (1 / totalColumns) * 100,
      });
    }

    cluster = [];
    clusterEnd = -Infinity;
  };

  for (const ev of sorted) {
    if (cluster.length && ev.startMinutes >= clusterEnd) {
      flush();
    }
    cluster.push(ev);
    clusterEnd = Math.max(clusterEnd, ev.endMinutes);
  }
  flush();

  return result;
}

/** Convertit un événement + un jour donné en {startMinutes, endMinutes} bornés à [0, 1440]. */
export function toDayMinutes(event, day) {
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(day);
  dayEnd.setHours(23, 59, 59, 999);

  const start = new Date(event.start) < dayStart ? dayStart : new Date(event.start);
  const end = new Date(event.end) > dayEnd ? dayEnd : new Date(event.end);

  const startMinutes = (start - dayStart) / 60000;
  const endMinutes = Math.max((end - dayStart) / 60000, startMinutes + 20); // durée mini visible

  return { startMinutes, endMinutes };
}
