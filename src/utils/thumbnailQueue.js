// One thumbnail per frame leaves input/scroll handling between expensive draws.
// Dependencies are injectable so cancellation/coalescing is testable without a DOM.
export const createThumbnailQueue = ({
  request = (callback) => requestAnimationFrame(callback),
  cancel = (id) => cancelAnimationFrame(id),
  reportError = (error) => console.warn('Template thumbnail failed:', error),
} = {}) => {
  const pending = new Map();
  let frame = null;
  const schedule = () => {
    if (frame === null && pending.size) frame = request(flush);
  };
  const flush = () => {
    frame = null;
    const first = pending.entries().next().value;
    if (!first) return;
    const [key, draw] = first;
    pending.delete(key);
    try { draw(); } catch (error) { reportError(error); }
    finally { schedule(); }
  };
  return (draw) => {
    const key = Symbol('thumbnail');
    pending.set(key, draw);
    schedule();
    return () => {
      pending.delete(key);
      if (!pending.size && frame !== null) {
        cancel(frame);
        frame = null;
      }
    };
  };
};

export const enqueueThumbnail = createThumbnailQueue();
