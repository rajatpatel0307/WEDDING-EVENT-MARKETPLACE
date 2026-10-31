export function createWishlistStore({ list, add, remove }) {
  let state = {
      owner: null,
      rows: [],
      loading: false,
      error: null,
      initialized: false,
    },
    pending,
    version = 0;
  const listeners = new Set(),
    emit = () => listeners.forEach((fn) => fn());
  function find(type, id) {
    return state.rows.find(
      (r) =>
        r.type === type &&
        String(
          type === "Vendor"
            ? r.vendorId
            : type === "Package"
              ? r.packageId
              : r.savedServiceId,
        ).toLowerCase() === String(id).toLowerCase(),
    );
  }
  function refresh(owner = state.owner) {
    if (!owner || state.owner !== owner) return Promise.resolve();
    if (pending?.owner === owner && pending.version === version)
      return pending.promise;
    const generation = version;
    state = { ...state, loading: true, error: null };
    emit();
    const promise = Promise.resolve()
      .then(list)
      .then((rows) => {
        if (version === generation) {
          state = {
            owner,
            rows,
            loading: false,
            error: null,
            initialized: true,
          };
          emit();
        }
      })
      .catch((error) => {
        if (version === generation) {
          state = { ...state, loading: false, error, initialized: true };
          emit();
        }
      })
      .finally(() => {
        if (pending?.promise === promise) pending = null;
      });
    pending = { owner, version: generation, promise };
    return promise;
  }
  return {
    getSnapshot: () => state,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    activate(owner) {
      if (state.owner !== owner) {
        version++;
        state = {
          owner,
          rows: [],
          loading: !!owner,
          error: null,
          initialized: false,
        };
        emit();
      }
      if (owner && !state.initialized) return refresh(owner);
      return Promise.resolve();
    },
    refresh,
    find,
    async toggle(owner, type, id) {
      if (!owner || state.owner !== owner)
        throw new Error("Sign in as a customer to save favorites.");
      const previous = find(type, id),
        result = previous ? await remove(previous.id) : await add({ type, id });
      if (pending?.owner === owner) await pending.promise;
      await refresh(owner);
      return result;
    },
  };
}
