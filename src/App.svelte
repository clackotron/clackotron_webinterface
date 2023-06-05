<script>
  import { onMount } from "svelte";
  import ModeSelect from "./lib/ModeSelect.svelte";
  import ModePreview from "./lib/ModePreview.svelte";
  import ModeOptions from "./lib/ModeOptions.svelte";
  import Loader from "./lib/Loader.svelte";
  import {
    dataLoaded,
    currentMode,
    currentOptions,
    currentValues,
    currentTemplate,
    expertTemplate,
  } from "./store/state";
  import {
    wiTitle,
    wiModules,
    wiIsExpert,
    wiModes,
    wiStrings,
    wiVersion,
    wiRevision,
  } from "./store/webinterface";

  $: {
    document.title = $wiTitle;
  }

  const loadModuleConfig = async () => {
    return fetch("/ui/config/modules.json")
      .then((response) => response.json())
      .then((data) => {
        $wiModules = data.modules;
      });
  };

  const loadWebinterfaceConfig = async () => {
    return fetch("/ui/config/webinterface.json")
      .then((response) => response.json())
      .then((data) => {
        $wiTitle = data.name;
        $wiIsExpert = data.expert;
        $wiModes = data.modes;
        $wiStrings = data.strings;
        $wiVersion = data.version;
        $wiRevision = data.revision;
      });
  };

  const loadConfig = () => {
    return fetch("/config")
      .then((response) => response.json())
      .then((data) => {
        $currentMode = data.mode;
        $expertTemplate = data.template;
        const simpleValues = data.parameters || {};
        $currentValues = {};
        Object.keys(simpleValues).forEach(
          (k) => ($currentValues[`{${k}}`] = simpleValues[k])
        );
        $dataLoaded = true;
      })
      .catch((e) => {
        console.error(e);
        window.setTimeout(loadConfig, 1000);
      });
  };

  const saveConfig = () => {
    const simpleValues = {};
    Object.keys($currentValues || {}).forEach((k) => {
      simpleValues[k.replace(/[\{\}]/g, "")] = $currentValues[k];
    });

    const payload = encodeURIComponent(
      JSON.stringify({
        mode: $currentMode,
        template: $currentTemplate,
        parameters: simpleValues
      })
    );

    fetch(`/config?payload=${payload}`, { method: "POST" })
      .then((response) => response.json())
      .then((data) => {
        if (!data.success) throw "NO_SUCCESS";
      })
      .catch(() => {
        alert($wiStrings["save-failed"]);
      });
  };

  onMount(async () => {
    await loadModuleConfig();
    await loadWebinterfaceConfig();
    await loadConfig();
  });
</script>

<main>
  <header>
    <h1 id="title">{$wiTitle}</h1>
  </header>
  <div class="content">
    {#if $dataLoaded}
      <h2 class="section-title">{$wiStrings["title-mode"]}</h2>
      <ModeSelect />

      {#if $currentOptions.length > 0 || ($wiIsExpert && $currentMode == "expert")}
        <h2 class="section-title">{$wiStrings["title-options"]}</h2>
        <ModeOptions />
      {/if}

      <h2 class="section-title">{$wiStrings["title-preview"]}</h2>
      <ModePreview />

      <div class="save-line">
        <button on:click={saveConfig}>{$wiStrings["save-button"]}</button>
      </div>
    {:else}
      <Loader />
    {/if}
  </div>
  <footer>{$wiStrings["copyright"]} &bull; {$wiVersion}</footer>
</main>

<style>
  .save-line {
    height: 48px;
    background: #e5e5e5;
    text-align: left;
  }

  .save-line button {
    margin: 7px 10px;
    padding: 10px 20px;
    border: 0;
    border-radius: 5px;
    box-shadow: none;
    background: #2d327d;
    color: #ffffff;
    cursor: pointer;
  }
</style>
