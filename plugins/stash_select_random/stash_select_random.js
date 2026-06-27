(function () {
  "use strict";

  const PluginApi = window.PluginApi;
  if (!PluginApi) {
    console.error("StashSelectRandom: PluginApi is not available.");
    return;
  }

  const React = PluginApi.React;
  const GQL = PluginApi.GQL;
  const { Button, Nav } = PluginApi.libraries.Bootstrap;
  const { faRandom } = PluginApi.libraries.FontAwesomeSolid;
  const { NavUtils, StashService } = PluginApi.utils;

  const STORAGE_KEY = "stashSelectRandom.filter";

  let busy = false;

  /** @type {{ filter: any | null, entity: string | null, variables: object | null, operationName: string | null }} */
  const activeContext = {
    filter: null,
    entity: null,
    variables: null,
    operationName: null,
  };

  const DOCUMENTS = {
    FindScenes: GQL.FindScenesDocument,
    FindSceneMarkers: GQL.FindSceneMarkersDocument,
    FindPerformers: GQL.FindPerformersDocument,
    FindImages: GQL.FindImagesDocument,
    FindGalleries: GQL.FindGalleriesDocument,
    FindStudios: GQL.FindStudiosDocument,
    FindTags: GQL.FindTagsDocument,
    FindTagsForList: GQL.FindTagsForListDocument || GQL.FindTagsDocument,
    FindGroups: GQL.FindGroupsDocument,
  };

  const ENTITIES = {
    scene: {
      operationNames: ["FindScenes"],
      objectFilterKey: "scene_filter",
      countField: "findScenes",
      itemsField: "scenes",
      strategy: "pageRandom",
      listComponent: "SceneList",
      legacyQuery: StashService.queryFindScenes,
      url: (item) => `/scenes/${item.id}`,
    },
    scene_marker: {
      operationNames: ["FindSceneMarkers"],
      objectFilterKey: "scene_marker_filter",
      countField: "findSceneMarkers",
      itemsField: "scene_markers",
      strategy: "pageRandom",
      listComponent: "SceneMarkerList",
      legacyQuery: StashService.queryFindSceneMarkers,
      url: (item) => NavUtils.makeSceneMarkerUrl(item),
    },
    performer: {
      operationNames: ["FindPerformers"],
      objectFilterKey: "performer_filter",
      countField: "findPerformers",
      itemsField: "performers",
      strategy: "indexPage",
      listComponent: "PerformerList",
      legacyQuery: StashService.queryFindPerformers,
      url: (item) => `/performers/${item.id}`,
    },
    image: {
      operationNames: ["FindImages"],
      objectFilterKey: "image_filter",
      countField: "findImages",
      itemsField: "images",
      strategy: "indexPage",
      listComponent: "ImageList",
      legacyQuery: StashService.queryFindImages,
      url: (item) => `/images/${item.id}`,
    },
    gallery: {
      operationNames: ["FindGalleries"],
      objectFilterKey: "gallery_filter",
      countField: "findGalleries",
      itemsField: "galleries",
      strategy: "indexPage",
      listComponent: "GalleryList",
      legacyQuery: StashService.queryFindGalleries,
      url: (item) => `/galleries/${item.id}`,
    },
    studio: {
      operationNames: ["FindStudios"],
      objectFilterKey: "studio_filter",
      countField: "findStudios",
      itemsField: "studios",
      strategy: "indexPage",
      listComponent: "StudioList",
      legacyQuery: StashService.queryFindStudios,
      url: (item) => `/studios/${item.id}`,
    },
    tag: {
      operationNames: ["FindTagsForList", "FindTags"],
      objectFilterKey: "tag_filter",
      countField: "findTags",
      itemsField: "tags",
      strategy: "indexPage",
      listComponent: "TagList",
      legacyQuery: StashService.queryFindTagsForList || StashService.queryFindTags,
      url: (item) => `/tags/${item.id}`,
    },
    group: {
      operationNames: ["FindGroups"],
      objectFilterKey: "group_filter",
      countField: "findGroups",
      itemsField: "groups",
      strategy: "indexPage",
      listComponent: "GroupList",
      legacyQuery: StashService.queryFindGroups,
      url: (item) => `/groups/${item.id}`,
    },
  };

  const OPERATION_TO_ENTITY = {};
  Object.entries(ENTITIES).forEach(([entityKey, config]) => {
    config.operationNames.forEach((name) => {
      OPERATION_TO_ENTITY[name] = entityKey;
    });
  });

  const FILTERED_LIST_COMPONENTS = {
    FilteredSceneList: "scene",
    FilteredSceneMarkerList: "scene_marker",
    FilteredPerformerList: "performer",
    FilteredImageList: "image",
    FilteredGalleryList: "gallery",
    FilteredStudioList: "studio",
    FilteredTagList: "tag",
    FilteredGroupList: "group",
  };

  function getOperationName(query) {
    if (!query || !query.definitions || !query.definitions.length) {
      return null;
    }
    const definition = query.definitions[0];
    if (definition.kind === "OperationDefinition" && definition.name) {
      return definition.name.value;
    }
    return null;
  }

  function cloneVariables(variables) {
    return JSON.parse(JSON.stringify(variables || {}));
  }

  function buildQueryVariables(variables, config) {
    const cloned = cloneVariables(variables);
    return {
      filter: cloned.filter || {},
      [config.objectFilterKey]: cloned[config.objectFilterKey] || {},
    };
  }

  function getDocumentForOperation(operationName) {
    return DOCUMENTS[operationName] || null;
  }

  function variablesFromListFilterModel(filter, config) {
    if (!filter || typeof filter.makeFindFilter !== "function") {
      return null;
    }
    try {
      return {
        filter: filter.makeFindFilter(),
        [config.objectFilterKey]: filter.makeFilter(),
      };
    } catch (err) {
      console.warn("StashSelectRandom: could not serialize filter", err);
      return null;
    }
  }

  function persistFilterState(entityKey, variables, operationName) {
    if (!entityKey || !variables) {
      return;
    }
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          entity: entityKey,
          operationName: operationName || ENTITIES[entityKey]?.operationNames[0],
          variables: cloneVariables(variables),
          savedAt: Date.now(),
        })
      );
    } catch (err) {
      console.warn("StashSelectRandom: could not persist filter", err);
    }
  }

  function loadFilterState() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      if (!parsed?.entity || !parsed?.variables || !ENTITIES[parsed.entity]) {
        return null;
      }
      return parsed;
    } catch (err) {
      console.warn("StashSelectRandom: could not load persisted filter", err);
      return null;
    }
  }

  function clearFilterState() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      // ignore
    }
    activeContext.filter = null;
    activeContext.entity = null;
    activeContext.variables = null;
    activeContext.operationName = null;
  }

  function applyStoredState(stored) {
    if (!stored) {
      return false;
    }
    activeContext.entity = stored.entity;
    activeContext.variables = cloneVariables(stored.variables);
    activeContext.operationName =
      stored.operationName || ENTITIES[stored.entity]?.operationNames[0] || null;
    activeContext.filter = null;
    return true;
  }

  function updateActiveContext(entityKey, variables, operationName) {
    if (!entityKey || !variables) {
      return;
    }
    activeContext.entity = entityKey;
    activeContext.variables = cloneVariables(variables);
    activeContext.operationName =
      operationName || ENTITIES[entityKey]?.operationNames[0] || null;
    activeContext.filter = null;
    persistFilterState(entityKey, variables, activeContext.operationName);
  }

  function findActiveListQuery() {
    const client = StashService.getClient?.();
    if (!client || typeof client.getObservableQueries !== "function") {
      return null;
    }

    let best = null;

    client.getObservableQueries().forEach((observableQuery) => {
      const operationName = getOperationName(observableQuery.options?.query);
      const entityKey = operationName ? OPERATION_TO_ENTITY[operationName] : null;
      if (!entityKey) {
        return;
      }

      const lastResult = observableQuery.getLastResult?.();
      if (!lastResult || lastResult.loading) {
        return;
      }

      const lastWrite = observableQuery.lastQueryTime || 0;
      if (!best || lastWrite >= best.lastWrite) {
        best = {
          entityKey,
          config: ENTITIES[entityKey],
          operationName,
          document: getDocumentForOperation(operationName),
          variables: cloneVariables(observableQuery.options?.variables),
          lastWrite,
        };
      }
    });

    return best;
  }

  function resolveFilterContext() {
    const activeQuery = findActiveListQuery();
    if (activeQuery) {
      updateActiveContext(
        activeQuery.entityKey,
        activeQuery.variables,
        activeQuery.operationName
      );
      return {
        entityKey: activeQuery.entityKey,
        config: activeQuery.config,
        variables: activeQuery.variables,
        document: activeQuery.document,
        filter: null,
      };
    }

    if (activeContext.variables && activeContext.entity && ENTITIES[activeContext.entity]) {
      const config = ENTITIES[activeContext.entity];
      return {
        entityKey: activeContext.entity,
        config,
        variables: activeContext.variables,
        document:
          getDocumentForOperation(activeContext.operationName) ||
          getDocumentForOperation(config.operationNames[0]) ||
          getDocumentForOperation(config.operationNames[1]),
        filter: null,
      };
    }

    if (activeContext.filter && activeContext.entity && ENTITIES[activeContext.entity]) {
      const config = ENTITIES[activeContext.entity];
      const variables = variablesFromListFilterModel(activeContext.filter, config);
      if (variables) {
        updateActiveContext(
          activeContext.entity,
          variables,
          config.operationNames[0]
        );
        return {
          entityKey: activeContext.entity,
          config,
          variables,
          document: getDocumentForOperation(config.operationNames[0]),
          filter: null,
        };
      }
      return {
        entityKey: activeContext.entity,
        config,
        variables: null,
        document: null,
        filter: activeContext.filter,
      };
    }

    const stored = loadFilterState();
    if (stored && applyStoredState(stored)) {
      const config = ENTITIES[stored.entity];
      return {
        entityKey: stored.entity,
        config,
        variables: activeContext.variables,
        document:
          getDocumentForOperation(stored.operationName) ||
          getDocumentForOperation(config.operationNames[0]) ||
          getDocumentForOperation(config.operationNames[1]),
        filter: null,
      };
    }

    return null;
  }

  function navigateTo(url) {
    if (!url || url === "#") {
      return;
    }

    if (url.startsWith("/") && typeof window.history.pushState === "function") {
      window.history.pushState(null, "", url);
      window.dispatchEvent(new PopStateEvent("popstate"));
      return;
    }

    window.location.assign(url);
  }

  function captureListFilter(entityKey) {
    return function (props) {
      if (!props?.filter) {
        return [props];
      }

      const config = ENTITIES[entityKey];
      activeContext.entity = entityKey;
      activeContext.filter = props.filter;

      const variables = variablesFromListFilterModel(props.filter, config);
      if (variables) {
        updateActiveContext(entityKey, variables, config.operationNames[0]);
      }

      return [props];
    };
  }

  Object.entries(ENTITIES).forEach(([entityKey, config]) => {
    PluginApi.patch.before(config.listComponent, captureListFilter(entityKey));
  });

  Object.entries(FILTERED_LIST_COMPONENTS).forEach(([component, entityKey]) => {
    PluginApi.patch.after(component, function (_props, result) {
      const active = findActiveListQuery();
      if (active && active.entityKey === entityKey) {
        updateActiveContext(
          active.entityKey,
          active.variables,
          active.operationName
        );
      }
      return result;
    });
  });

  function handleLocationChange(e) {
    const location = e?.detail?.data?.location || {
      pathname: window.location.pathname,
      search: window.location.search,
    };
    const path = (location.pathname || "").replace(/\/$/, "") || "/";

    if (path === "/settings" || path === "/stats" || path.startsWith("/plugin")) {
      clearFilterState();
      setTimeout(ensureButtonVisible, 100);
      return;
    }

    const active = findActiveListQuery();
    if (active) {
      updateActiveContext(
        active.entityKey,
        active.variables,
        active.operationName
      );
    }

    setTimeout(ensureButtonVisible, 100);
  }

  PluginApi.Event.addEventListener("stash:location", handleLocationChange);

  const storedOnLoad = loadFilterState();
  if (storedOnLoad) {
    applyStoredState(storedOnLoad);
  }

  async function queryWithDocument(document, variables) {
    const client = StashService.getClient();
    return client.query({
      query: document,
      variables: variables,
      fetchPolicy: "network-only",
    });
  }

  async function getCountFromVariables(baseVariables, config, document) {
    const variables = buildQueryVariables(baseVariables, config);
    variables.filter = {
      ...variables.filter,
      page: 1,
      per_page: 1,
    };
    const result = await queryWithDocument(document, variables);
    return result?.data?.[config.countField]?.count ?? 0;
  }

  async function pickPageRandomFromVariables(baseVariables, count, config, document) {
    const perPage = baseVariables.filter?.per_page || 40;
    const pages = Math.ceil(count / perPage);
    const page = Math.floor(Math.random() * pages) + 1;
    const indexMax = Math.min(perPage, count);
    const index = Math.floor(Math.random() * indexMax);

    const variables = buildQueryVariables(baseVariables, config);
    variables.filter = {
      ...variables.filter,
      page: page,
      per_page: perPage,
      sort: "random",
    };

    const result = await queryWithDocument(document, variables);
    const items = result?.data?.[config.countField]?.[config.itemsField] ?? [];
    return items[index] ?? null;
  }

  async function pickIndexPageFromVariables(baseVariables, count, config, document) {
    const index = Math.floor(Math.random() * count);
    const variables = buildQueryVariables(baseVariables, config);
    variables.filter = {
      ...variables.filter,
      page: index + 1,
      per_page: 1,
    };

    const result = await queryWithDocument(document, variables);
    const items = result?.data?.[config.countField]?.[config.itemsField] ?? [];
    return items[0] ?? null;
  }

  async function pickPageRandomFromFilter(filter, count, config) {
    const pages = Math.ceil(count / filter.itemsPerPage);
    const page = Math.floor(Math.random() * pages) + 1;
    const indexMax = Math.min(filter.itemsPerPage, count);
    const index = Math.floor(Math.random() * indexMax);

    const filterCopy = filter.clone();
    filterCopy.currentPage = page;
    filterCopy.sortBy = "random";

    const result = await config.legacyQuery(filterCopy);
    const items = result?.data?.[config.countField]?.[config.itemsField] ?? [];
    return items[index] ?? null;
  }

  async function pickIndexPageFromFilter(filter, count, config) {
    const index = Math.floor(Math.random() * count);
    const filterCopy = filter.clone();
    filterCopy.itemsPerPage = 1;
    filterCopy.currentPage = index + 1;

    const result = await config.legacyQuery(filterCopy);
    const items = result?.data?.[config.countField]?.[config.itemsField] ?? [];
    return items[0] ?? null;
  }

  async function navigateToFilteredRandom() {
    if (busy) {
      return;
    }

    busy = true;
    try {
      const resolved = resolveFilterContext();
      if (!resolved) {
        alert(
          "No filtered list is active. Open a list view (scenes, performers, tags, etc.) and wait for results to load."
        );
        return;
      }

      const { entityKey, config, variables, document, filter } = resolved;

      if (!variables && !filter) {
        alert(
          "No filtered list is active. Open a list view (scenes, performers, tags, etc.) and wait for results to load."
        );
        return;
      }

      let count = 0;
      if (variables && document) {
        count = await getCountFromVariables(variables, config, document);
      } else if (variables) {
        count = await getCountFromVariables(
          variables,
          config,
          getDocumentForOperation(config.operationNames[0])
        );
      } else if (filter) {
        const countFilter = filter.clone();
        countFilter.currentPage = 1;
        countFilter.itemsPerPage = 1;
        const result = await config.legacyQuery(countFilter);
        count = result?.data?.[config.countField]?.count ?? 0;
      }

      if (!count) {
        alert("No results match the current filter.");
        return;
      }

      let item = null;
      if (variables && document) {
        if (config.strategy === "pageRandom") {
          item = await pickPageRandomFromVariables(variables, count, config, document);
        } else {
          item = await pickIndexPageFromVariables(variables, count, config, document);
        }
      } else if (variables) {
        const fallbackDocument = getDocumentForOperation(config.operationNames[0]);
        if (config.strategy === "pageRandom") {
          item = await pickPageRandomFromVariables(
            variables,
            count,
            config,
            fallbackDocument
          );
        } else {
          item = await pickIndexPageFromVariables(
            variables,
            count,
            config,
            fallbackDocument
          );
        }
      } else if (filter) {
        if (config.strategy === "pageRandom") {
          item = await pickPageRandomFromFilter(filter, count, config);
        } else {
          item = await pickIndexPageFromFilter(filter, count, config);
        }
      }

      if (!item) {
        alert("Could not pick a random item from the current filter.");
        return;
      }

      const url = config.url(item);
      if (!url || url === "#") {
        alert("Could not build a URL for the selected item.");
        return;
      }

      if (variables) {
        persistFilterState(
          entityKey,
          variables,
          activeContext.operationName || config.operationNames[0]
        );
      } else if (filter) {
        const serialized = variablesFromListFilterModel(filter, config);
        if (serialized) {
          persistFilterState(entityKey, serialized, config.operationNames[0]);
        }
      }

      navigateTo(url);
    } catch (err) {
      console.error("StashSelectRandom:", err);
      alert("Error picking a random filtered item. See the browser console for details.");
    } finally {
      busy = false;
    }
  }

  function createRandomButtonElement() {
    const wrapper = document.createElement("div");
    wrapper.className = "nav-utility filtered-random-btn";
    wrapper.innerHTML =
      '<button type="button" class="btn minimal d-flex align-items-center h-100 filtered-random-btn-trigger" title="Random from current filter">' +
      '<span aria-hidden="true" style="margin-right:0.35em">&#x2682;</span>' +
      '<span class="d-none d-sm-inline">Random</span>' +
      "</button>";
    wrapper.querySelector("button").addEventListener("click", (event) => {
      event.preventDefault();
      navigateToFilteredRandom();
    });
    return wrapper;
  }

  function injectDomButton() {
    const parents = document.querySelectorAll(
      '.navbar-buttons.flex-row.ml-auto.order-xl-2, .top-nav .navbar-collapse .navbar-nav:last-child'
    );

    let inserted = false;
    parents.forEach((parent) => {
      if (parent.querySelector(".filtered-random-btn")) {
        inserted = true;
        return;
      }

      const donateNav =
        parent.querySelector('a[href*="opencollective"]')?.closest(".nav-utility") ||
        parent.querySelector(".donate")?.closest(".nav-utility");

      if (donateNav && donateNav.parentElement === parent) {
        parent.insertBefore(createRandomButtonElement(), donateNav);
        inserted = true;
      }
    });

    return inserted;
  }

  let patchRegistered = false;

  function registerReactPatch() {
    PluginApi.patch.before("MainNavBar.UtilityItems", function (props) {
      const { Icon } = PluginApi.components;

      const randomButton = React.createElement(
        Nav.Link,
        {
          as: "div",
          className: "nav-utility filtered-random-btn",
          title: "Random from current filter",
          onClick: (event) => {
            event.preventDefault();
            navigateToFilteredRandom();
          },
        },
        React.createElement(
          Button,
          { className: "minimal d-flex align-items-center h-100" },
          React.createElement(Icon, { icon: faRandom }),
          React.createElement(
            "span",
            { className: "d-none d-sm-inline" },
            "Random"
          )
        )
      );

      return [
        {
          ...props,
          children: React.createElement(
            React.Fragment,
            null,
            randomButton,
            props.children
          ),
        },
      ];
    });
    patchRegistered = true;
  }

  try {
    registerReactPatch();
  } catch (err) {
    console.warn("StashSelectRandom: React patch failed, using DOM fallback.", err);
  }

  function ensureButtonVisible() {
    if (!patchRegistered || !document.querySelector(".filtered-random-btn")) {
      injectDomButton();
    }
  }

  window.addEventListener("load", ensureButtonVisible);

  const navContainer = document.querySelector(
    ".navbar-buttons.flex-row.ml-auto.order-xl-2"
  );
  if (navContainer) {
    const observer = new MutationObserver(() => {
      if (!navContainer.querySelector(".filtered-random-btn")) {
        injectDomButton();
      }
    });
    observer.observe(navContainer, { childList: true, subtree: true });
  }

  let attempts = 0;
  const interval = setInterval(() => {
    attempts += 1;
    ensureButtonVisible();
    if (attempts >= 30) {
      clearInterval(interval);
    }
  }, 500);
})();
