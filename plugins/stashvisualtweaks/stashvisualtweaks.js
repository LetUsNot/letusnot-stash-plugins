(function () {
  "use strict";

  const PluginApi = window.PluginApi;
  const React = PluginApi.React;
  const { Form } = PluginApi.libraries.Bootstrap;

  const PLUGIN_ID = "stashvisualtweaks";
  const LEGACY_SCENE_ROW_KEY = "maxSceneRowCount";
  const SCENE_USE_DEFAULT_KEY = "sceneRowCountUseDefault";
  const SCENE_COUNT_KEY = "sceneRowCount";
  const PERFORMER_USE_DEFAULT_KEY = "performerRowCountUseDefault";
  const PERFORMER_COUNT_KEY = "performerRowCount";
  const GROUP_USE_DEFAULT_KEY = "groupRowCountUseDefault";
  const GROUP_COUNT_KEY = "groupRowCount";
  const ROUNDED_CARDS_KEY = "roundedCards";
  const MIN_ROW_COUNT = 1;
  const MAX_ROW_COUNT = 10;

  const SCENE_ZOOM_WIDTHS = [280, 340, 480, 640];
  const PERFORMER_ZOOM_WIDTHS = [240, 300, 375, 470];
  const GROUP_ZOOM_WIDTHS = [210, 250, 300, 375];

  /** @type {number | null} null = use stock Stash layout */
  let maxSceneRowCount = null;
  /** @type {number | null} */
  let maxPerformerRowCount = null;
  /** @type {number | null} */
  let maxGroupRowCount = null;

  function clampRowCount(value) {
    const parsed = Number.parseInt(String(value), 10);
    if (Number.isNaN(parsed)) {
      return 5;
    }
    return Math.max(MIN_ROW_COUNT, Math.min(MAX_ROW_COUNT, parsed));
  }

  function parseBoolean(value, defaultValue) {
    if (value === true || value === "true") {
      return true;
    }
    if (value === false || value === "false") {
      return false;
    }
    return defaultValue;
  }

  function migratePluginSettings(raw) {
    const settings = { ...(raw ?? {}) };

    if (
      LEGACY_SCENE_ROW_KEY in settings &&
      !(SCENE_USE_DEFAULT_KEY in settings)
    ) {
      const legacy = settings[LEGACY_SCENE_ROW_KEY];
      const legacyString =
        legacy === null || legacy === undefined || typeof legacy === "object"
          ? "default"
          : String(legacy);

      settings[SCENE_USE_DEFAULT_KEY] = legacyString === "default";
      if (!settings[SCENE_USE_DEFAULT_KEY]) {
        settings[SCENE_COUNT_KEY] = clampRowCount(legacyString);
      }
      delete settings[LEGACY_SCENE_ROW_KEY];
    }

    if (!(SCENE_USE_DEFAULT_KEY in settings)) {
      settings[SCENE_USE_DEFAULT_KEY] = true;
    }
    if (!(SCENE_COUNT_KEY in settings)) {
      settings[SCENE_COUNT_KEY] = 5;
    }
    if (!(PERFORMER_USE_DEFAULT_KEY in settings)) {
      settings[PERFORMER_USE_DEFAULT_KEY] = true;
    }
    if (!(PERFORMER_COUNT_KEY in settings)) {
      settings[PERFORMER_COUNT_KEY] = 5;
    }
    if (!(GROUP_USE_DEFAULT_KEY in settings)) {
      settings[GROUP_USE_DEFAULT_KEY] = true;
    }
    if (!(GROUP_COUNT_KEY in settings)) {
      settings[GROUP_COUNT_KEY] = 5;
    }
    if (!(ROUNDED_CARDS_KEY in settings)) {
      settings[ROUNDED_CARDS_KEY] = false;
    }

    settings[SCENE_USE_DEFAULT_KEY] = parseBoolean(
      settings[SCENE_USE_DEFAULT_KEY],
      true
    );
    settings[PERFORMER_USE_DEFAULT_KEY] = parseBoolean(
      settings[PERFORMER_USE_DEFAULT_KEY],
      true
    );
    settings[GROUP_USE_DEFAULT_KEY] = parseBoolean(
      settings[GROUP_USE_DEFAULT_KEY],
      true
    );
    settings[SCENE_COUNT_KEY] = clampRowCount(settings[SCENE_COUNT_KEY]);
    settings[PERFORMER_COUNT_KEY] = clampRowCount(settings[PERFORMER_COUNT_KEY]);
    settings[GROUP_COUNT_KEY] = clampRowCount(settings[GROUP_COUNT_KEY]);
    settings[ROUNDED_CARDS_KEY] = parseBoolean(settings[ROUNDED_CARDS_KEY], false);

    return settings;
  }

  function parseRowCount(settings, useDefaultKey, countKey) {
    const migrated = migratePluginSettings(settings);
    if (parseBoolean(migrated[useDefaultKey], true)) {
      return null;
    }
    return clampRowCount(migrated[countKey]);
  }

  function applyRoundedCards(enabled) {
    if (enabled) {
      document.documentElement.dataset.svtRoundedCards = "true";
    } else {
      delete document.documentElement.dataset.svtRoundedCards;
    }
  }

  function applyPluginSettings(settings) {
    const migrated = migratePluginSettings(settings);
    maxSceneRowCount = parseRowCount(migrated, SCENE_USE_DEFAULT_KEY, SCENE_COUNT_KEY);
    maxPerformerRowCount = parseRowCount(
      migrated,
      PERFORMER_USE_DEFAULT_KEY,
      PERFORMER_COUNT_KEY
    );
    maxGroupRowCount = parseRowCount(
      migrated,
      GROUP_USE_DEFAULT_KEY,
      GROUP_COUNT_KEY
    );
    applyRoundedCards(parseBoolean(migrated[ROUNDED_CARDS_KEY], false));
  }

  async function refreshSettings() {
    try {
      const client = PluginApi.utils.StashService.getClient();
      const { data } = await client.query({
        query: PluginApi.GQL.ConfigurationDocument,
        fetchPolicy: "cache-first",
      });
      applyPluginSettings(data?.configuration?.plugins?.[PLUGIN_ID]);
    } catch (error) {
      console.warn("[stashvisualtweaks] Failed to load plugin settings:", error);
    }
  }

  function calculateCardWidth(containerWidth, preferredWidth, maxPerRow) {
    const containerPadding = 30;
    const cardMargin = 10;
    const maxUsableWidth = containerWidth - containerPadding;
    let maxElementsOnRow = Math.ceil(maxUsableWidth / preferredWidth);

    if (maxPerRow !== null) {
      maxElementsOnRow = Math.max(1, Math.min(maxElementsOnRow, maxPerRow));
    }

    return maxUsableWidth / maxElementsOnRow - cardMargin;
  }

  function isMobile() {
    return window.matchMedia("(max-width: 575.98px)").matches;
  }

  function getSceneGridContainerWidth() {
    const row = document.querySelector(
      ".scene-list .row.justify-content-center, .row.justify-content-center:has(.scene-card)"
    );
    return row?.clientWidth ?? 0;
  }

  function getPerformerGridContainerWidth() {
    const row = document.querySelector(
      ".row.justify-content-center:has(.performer-card)"
    );
    return row?.clientWidth ?? 0;
  }

  function getGroupGridContainerWidth() {
    const row = document.querySelector(
      ".row.justify-content-center:has(.group-card)"
    );
    return row?.clientWidth ?? 0;
  }

  function capCardProps(props, zoomWidths, maxPerRow, containerWidth, widthKey) {
    if (maxPerRow === null || props.zoomIndex === undefined) {
      return props;
    }

    if (isMobile()) {
      return props;
    }

    const zoomIndex = props.zoomIndex;
    if (zoomIndex < 0 || zoomIndex >= zoomWidths.length) {
      return props;
    }

    if (!containerWidth) {
      return props;
    }

    const cappedWidth = calculateCardWidth(
      containerWidth,
      zoomWidths[zoomIndex],
      maxPerRow
    );

    return { ...props, [widthKey]: cappedWidth };
  }

  refreshSettings();
  PluginApi.Event.addEventListener("stash:location", () => {
    refreshSettings();
  });

  PluginApi.patch.before("PluginSettings", function (props) {
    if (props.pluginID !== PLUGIN_ID) {
      return [props];
    }

    return [{ ...props, settings: [] }];
  });

  PluginApi.patch.after("PluginSettings", function (props, _element) {
    if (props.pluginID !== PLUGIN_ID) {
      return _element;
    }

    function RowCountControl(controlProps) {
      const {
        title,
        description,
        useDefaultKey,
        countKey,
        onApplyCaps,
      } = controlProps;
      const { plugins, savePluginSettings } = PluginApi.hooks.useSettings();
      const raw = plugins[PLUGIN_ID] ?? {};
      const current = migratePluginSettings(raw);
      const useDefault = current[useDefaultKey];
      const count = current[countKey];

      function persist(nextSettings) {
        const migrated = migratePluginSettings(nextSettings);
        applyPluginSettings(migrated);
        if (onApplyCaps) {
          onApplyCaps(migrated);
        }
        savePluginSettings(PLUGIN_ID, migrated);
      }

      function onUseDefaultChange(event) {
        persist({
          ...current,
          [useDefaultKey]: event.currentTarget.checked,
        });
      }

      function onCountChange(event) {
        persist({
          ...current,
          [countKey]: clampRowCount(event.currentTarget.value),
        });
      }

      function onCountBlur(event) {
        const clamped = clampRowCount(event.currentTarget.value);
        if (String(clamped) !== event.currentTarget.value) {
          persist({
            ...current,
            [countKey]: clamped,
          });
        }
      }

      return React.createElement(
        "div",
        { className: "setting" },
        React.createElement(
          "div",
          null,
          React.createElement("h3", null, title),
          React.createElement("div", { className: "sub-heading" }, description)
        ),
        React.createElement(
          "div",
          null,
          React.createElement(Form.Check, {
            type: "checkbox",
            id: `plugin-${PLUGIN_ID}-${useDefaultKey}`,
            label: "Use default (stock Stash layout)",
            checked: useDefault,
            onChange: onUseDefaultChange,
          }),
          React.createElement(Form.Control, {
            type: "number",
            className: "input-control",
            id: `plugin-${PLUGIN_ID}-${countKey}`,
            min: MIN_ROW_COUNT,
            max: MAX_ROW_COUNT,
            step: 1,
            value: count,
            disabled: useDefault,
            onChange: onCountChange,
            onBlur: onCountBlur,
          })
        )
      );
    }

    function RoundedCardsControl() {
      const { plugins, savePluginSettings } = PluginApi.hooks.useSettings();
      const raw = plugins[PLUGIN_ID] ?? {};
      const current = migratePluginSettings(raw);
      const roundedCards = current[ROUNDED_CARDS_KEY];

      function onRoundedCardsChange(event) {
        const next = {
          ...current,
          [ROUNDED_CARDS_KEY]: event.currentTarget.checked,
        };
        const migrated = migratePluginSettings(next);
        applyPluginSettings(migrated);
        savePluginSettings(PLUGIN_ID, migrated);
      }

      return React.createElement(
        "div",
        { className: "setting" },
        React.createElement(
          "div",
          null,
          React.createElement("h3", null, "Rounded Cards"),
          React.createElement(
            "div",
            { className: "sub-heading" },
            "Smooths grid card corners on scenes, performers, studios, groups, galleries, and other list cards."
          )
        ),
        React.createElement(
          "div",
          null,
          React.createElement(Form.Check, {
            type: "checkbox",
            id: `plugin-${PLUGIN_ID}-${ROUNDED_CARDS_KEY}`,
            label: "Rounded cards",
            checked: roundedCards,
            onChange: onRoundedCardsChange,
          })
        )
      );
    }

    function PluginSettingsPanel() {
      return React.createElement(
        "div",
        { className: "plugin-settings" },
        React.createElement(RoundedCardsControl),
        React.createElement(RowCountControl, {
          title: "Max Scene Row Count",
          description:
            "Limits how many scene cards appear on one row. Narrower layouts can still show fewer, wider cards.",
          useDefaultKey: SCENE_USE_DEFAULT_KEY,
          countKey: SCENE_COUNT_KEY,
        }),
        React.createElement(RowCountControl, {
          title: "Max Performer Row Count",
          description:
            "Limits how many performer cards appear on one row. Narrower layouts can still show fewer, wider cards.",
          useDefaultKey: PERFORMER_USE_DEFAULT_KEY,
          countKey: PERFORMER_COUNT_KEY,
        }),
        React.createElement(RowCountControl, {
          title: "Max Group Row Count",
          description:
            "Limits how many group cards appear on one row. Narrower layouts can still show fewer, wider cards.",
          useDefaultKey: GROUP_USE_DEFAULT_KEY,
          countKey: GROUP_COUNT_KEY,
        })
      );
    }

    return React.createElement(PluginSettingsPanel);
  });

  PluginApi.patch.before("SceneCard", function (props) {
    const capped = capCardProps(
      props,
      SCENE_ZOOM_WIDTHS,
      maxSceneRowCount,
      getSceneGridContainerWidth(),
      "width"
    );
    return [capped];
  });

  PluginApi.patch.before("PerformerCard", function (props) {
    const capped = capCardProps(
      props,
      PERFORMER_ZOOM_WIDTHS,
      maxPerformerRowCount,
      getPerformerGridContainerWidth(),
      "cardWidth"
    );
    return [capped];
  });

  PluginApi.patch.before("GroupCard", function (props) {
    const capped = capCardProps(
      props,
      GROUP_ZOOM_WIDTHS,
      maxGroupRowCount,
      getGroupGridContainerWidth(),
      "cardWidth"
    );
    return [capped];
  });
})();
