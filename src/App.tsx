import { createSignal, Match, Show, Switch, type Component, onMount } from "solid-js";
import Welcome from "./screens/Welcome";
import Home from "./screens/Home";
import Workspace from "./screens/Workspace";
import Settings from "./screens/Settings";
import { projects, activeProjectId, isOnboardingDone } from "./stores/projects";
import { UpdateBanner } from "./components/UpdateBanner";

type Screen = "welcome" | "home" | "workspace" | "settings";

const App: Component = () => {
  // Determine initial screen from persisted state
  const initialScreen = (): Screen => {
    if (!isOnboardingDone() || projects().length === 0) return "welcome";
    return "home";
  };

  const [screen, setScreen] = createSignal<Screen>(initialScreen());

  // When the user completes Welcome (project added + onboarding done),
  // go directly to workspace with the newly active project.
  const handleWelcomeOpen = () => {
    setScreen(activeProjectId() ? "workspace" : "home");
  };

  // Home → workspace: activeProjectId has been set by Home before calling this.
  const handleOpenWorkspace = () => setScreen("workspace");
  const handleSettings = () => setScreen("settings");
  const handleSettingsBack = () => setScreen("workspace");
  const handleExit = () => setScreen("home");

  // Derive the active project for the Workspace screen.
  const activeProject = () => {
    const id = activeProjectId();
    const list = projects();
    if (id) {
      const found = list.find((p) => p.id === id);
      if (found) return found;
    }
    return list.slice().sort((a, b) => b.lastOpenedAt - a.lastOpenedAt)[0] ?? null;
  };

  // If we land on workspace but there's no valid project, drop back to home.
  onMount(() => {
    if (screen() === "workspace" && !activeProject()) setScreen("home");
  });

  return (
    <>
      <Switch>
      <Match when={screen() === "welcome"}>
        <Welcome onOpen={handleWelcomeOpen} />
      </Match>
      <Match when={screen() === "home"}>
        <Home onOpenWorkspace={handleOpenWorkspace} />
      </Match>
      <Match when={screen() === "workspace"}>
        <Show
          when={activeProject()}
          fallback={
            <div class="flex h-screen items-center justify-center bg-ink-950 font-mono text-sm text-ink-500">
              No project selected.{" "}
              <button
                type="button"
                onClick={() => setScreen("home")}
                class="ml-2 text-brand-300 underline"
              >
                Go home
              </button>
            </div>
          }
        >
          {(p) => <Workspace project={p()} onSettings={handleSettings} onExit={handleExit} />}
        </Show>
      </Match>
      <Match when={screen() === "settings"}>
        <Settings onBack={handleSettingsBack} />
      </Match>
      </Switch>
      <UpdateBanner />
    </>
  );
};

export default App;
