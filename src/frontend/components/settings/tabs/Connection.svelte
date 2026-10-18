<script lang="ts">
    import { onMount } from "svelte"
    import { Main } from "../../../../types/IPC/Main"
    import { requestMain, sendMain } from "../../../IPC/main"
    import { activePopup, activeTriggerFunction, connections, disabledServers, maxConnections, obsData, outputs, popupData, ports, serverData, special } from "../../../stores"
    import Icon from "../../helpers/Icon.svelte"
    import { checkWindowCapture } from "../../helpers/output"
    import InputRow from "../../input/InputRow.svelte"
    import Title from "../../input/Title.svelte"
    import MaterialButton from "../../inputs/MaterialButton.svelte"
    import MaterialNumberInput from "../../inputs/MaterialNumberInput.svelte"
    import MaterialTextInput from "../../inputs/MaterialTextInput.svelte"
    import MaterialToggleSwitch from "../../inputs/MaterialToggleSwitch.svelte"
    import Tip from "../../main/Tip.svelte"

    let ip = "localhost"

    onMount(async () => {
        ip = ((await requestMain(Main.IP)) || ["localhost"])[0]
    })

    // WIP reset in popups
    // function reset() {
    //     ports.set({ remote: 5510, stage: 5511 })
    //     maxConnections.set(10)
    //     disabledServers.set({})
    //     serverData.set({ remote: { password: randomNumber(1000, 9999).toString() } })
    // }
    // const randomNumber = (from: number, to: number): number => Math.floor(Math.random() * (to - from)) + from

    function toggleServer(e: any, id: string) {
        let value = e.detail

        disabledServers.update((a) => {
            a[id] = !value
            return a
        })

        if (value) {
            popupData.set({ ip, id })
            activePopup.set("connect")
        }

        if (id === "output_stream") {
            if ($serverData?.output_stream?.outputId && !$outputs[$serverData.output_stream.outputId]) {
                serverData.update((a) => {
                    delete a.output_stream.outputId
                    return a
                })
            }

            if (value) checkWindowCapture()
        }
    }

    function toggleCompanion(e: any) {
        let value = e.detail

        serverData.update((a) => {
            if (!a.companion) a.companion = {}
            a.companion.enabled = value
            return a
        })
        sendMain(Main.SERVER_DATA, $serverData)

        if (value) sendMain(Main.WEBSOCKET_START, { port: $ports.companion, password: $serverData?.companion?.password })
        else sendMain(Main.WEBSOCKET_STOP)
    }

    function restart() {
        sendMain(Main.START, { ports: $ports, max: $maxConnections, disabled: $disabledServers, data: $serverData })
    }

    // restart servers on toggle on/off
    let initial = true
    $: {
        $disabledServers
        if (initial) initial = false
        else restart()
    }

    $: if ($activeTriggerFunction.includes("open_connection_") && ip !== "localhost") openConnection()
    function openConnection() {
        const id = $activeTriggerFunction.slice(16)
        popupData.set({ ip, id })
        activePopup.set("connect")
        activeTriggerFunction.set("")
    }

    const servers = [
        { id: "remote", name: "RemoteShow", icon: "connection", enabledByDefault: true },
        { id: "stage", name: "StageShow", icon: "stage", enabledByDefault: true },
        { id: "controller", name: "ControlShow", icon: "connection", enabledByDefault: false },
        // ...(($special.optimizedMode && $disabledServers.output_stream !== false) ? [] : [{ id: "output_stream", name: "OutputShow", icon: "stage", enabledByDefault: false }]),
        { id: "output_stream", name: "OutputShow", icon: "stage", enabledByDefault: false },
        // Bitfocus Companion (WebSocket/REST)
        { id: "companion", name: "API", icon: "companion", enabledByDefault: false, url: "https://github.com/zerokurns/meeting-control-center" }
        // { id: "rest", name: "REST Listener", icon: "companion", enabledByDefault: false, url: "https://github.com/zerokurns/meeting-control-center" },
    ]
    // Camera

    // OBS Controller

    let obsWasDisabled = !$obsData.enabled

    let obsIP = $obsData.ip || "localhost"
    let obsPort = $obsData.port || 4455
    $: if (obsIP || obsPort) obsData.update((d) => ({ ...d, ip: obsIP, port: obsPort }))
</script>

{#each servers as server}
    {@const disabled = server.id === "companion" ? $serverData?.companion?.enabled !== true : server.enabledByDefault ? $disabledServers[server.id] === true : $disabledServers[server.id] !== false}
    {@const connections = Object.keys($connections[server.id.toUpperCase()] || {})?.length || 0}

    <InputRow>
        <MaterialButton
            style="flex: 1;justify-content: space-between;"
            {disabled}
            on:click={() => {
                popupData.set({ ip, id: server.id })
                activePopup.set("connect")
            }}
        >
            <span style="display: flex;align-items: center;justify-content: center;gap: 15px;">
                <Icon id={server.icon} size={1.1} />

                {server.name}

                {#if server.id === "companion"}
                    <span style="opacity: 0.5;font-size: 0.7em;margin-left: 5px;">WebSocket/REST/OSC/Companion</span>
                {/if}
                {#if connections}
                    <span style="opacity: 0.5;font-size: 0.7em;margin-left: 5px;">{connections}</span>
                {/if}
            </span>

            {#if server.id === "output_stream" && $serverData.output_stream?.sendAudio}
                <span style="border: none;display: flex;align-items: center;justify-content: end;">
                    <Icon id="volume" />
                </span>
            {/if}
        </MaterialButton>

        {#if server.id === "companion"}
            <MaterialToggleSwitch label="" checked={$serverData?.companion?.enabled === true} on:change={toggleCompanion} />
        {:else}
            <MaterialToggleSwitch label="" checked={server.enabledByDefault ? $disabledServers[server.id] !== true : $disabledServers[server.id] === false} on:change={(e) => toggleServer(e, server.id)} />
        {/if}
    </InputRow>
{/each}

<!-- OBS Studio Controller -->
<Title label="OBS Studio" icon="record" />

<InputRow arrow={$obsData.enabled}>
    <MaterialToggleSwitch
        label="OBS Studio Controller"
        style="width: 100%;"
        checked={$obsData.enabled}
        defaultValue={false}
        on:change={(e) => {
            if (!e.detail) obsWasDisabled = true
            obsData.update((a) => ({ ...a, enabled: e.detail }))
        }}
    />

    <div slot="menu">
        <MaterialTextInput label="IP" value={obsIP} defaultValue="localhost" placeholder="localhost" on:change={(e) => (obsIP = e.detail)} />
        <MaterialNumberInput label="settings.port" value={obsPort} defaultValue={4455} placeholder="4455" on:change={(e) => (obsPort = e.detail)} />
    </div>
</InputRow>

{#if $obsData.enabled && obsWasDisabled}
    <Tip value="edit.position: guide_title.drawer > tabs.functions > OBS Studio" top={15} />
{/if}
