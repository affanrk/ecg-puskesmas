# System Flow Documentation (Technical Swimlanes)

This document maps the architectural flows using standard flowchart notation organized into "Swimlanes" (Subsystems). It reflects the current codebase structure in `E:\KERJAAN\Oneject\Development\ecg-puskesmas\app`.

**Notation Legend:**
- `([Start/End])`: Terminal Point (Trigger or End of flow).
- `[Process]`: Internal function call, calculation, or logic execution.
- `[/Input/Output/]`: Data transmission (WebSocket/MQTT) or User Input.
- `{Decision}`: Conditional Logic (If/Else).
- `[(Database)]`: Read/Write to PostgreSQL.
- `[[Subroutine]]`: Complex process defined elsewhere.

---

## 1. Live Data Ingestion Pipeline
*Flow: From hardware MQTT publication to Frontend Visualization.*

```mermaid
flowchart LR
    %% SWIMLANE: HARDWARE
    subgraph External [External / Hardware]
        StartStream([Start: MQTT Pub])
    end

    %% SWIMLANE: BACKEND SERVICE
    subgraph Backend_Service [App: MQTT Service]
        direction TB
        RecvMsg[/Client: _handle_message/]
        Parse[[Protocol: parse_packet]]
        CheckNew{New Device?}
        
        RecvMsg --> CheckNew
        CheckNew -- Yes --> NotifyList[/Notify List Update/]
        CheckNew -- No --> Parse
        
        Parse --> Process["Handler: process_samples()"]
        Process --> Jitter["Handler: _handle_jitter_buffer()"]
        Jitter --> LiveCalc["Handler: _process_single_sample()"]
    end

    %% SWIMLANE: BACKEND STATE
    subgraph Backend_State [App: Device State]
        LiveCalc --> Thrott{Throttle Limit?}
        Thrott -- Pass --> BroadWS[/State: broadcast_to_device/]
        Thrott -- Block --> Drop([End: Drop Frame])
    end

    %% SWIMLANE: FRONTEND
    subgraph Frontend [Frontend: UI]
        direction TB
        BroadWS -.->|WS: live_data| SocketRx[/Socket.js: onmessage/]
        SocketRx --> EvBus[Events.js: emit 'ecg-data']
        EvBus --> Chart["Charts.js: uPlot.setData()"]
        Chart --> Render([End: Render Graph])
    end

    StartStream --> RecvMsg
```

---

## 2. Recording Session Control
*Flow: Split into (A) The Command to Start and (B) The Data Storage Loop.*

```mermaid
flowchart LR
    %% SWIMLANE: FRONTEND USER INTERACTION
    subgraph Frontend [Frontend: User Action]
        direction TB
        UserStart([Start: Click 'Start Rec'])
        ValInput{Valid Input?}
        
        UserStart --> ValInput
        ValInput -- No --> Toast[/Toast Error/]
        ValInput -- Yes --> SendCmd[/Socket.js: sendJson 'start_recording'/]
    end

    %% SWIMLANE: BACKEND CONTROL (API)
    subgraph Backend_Control [Backend: Control Logic]
        direction TB
        SendCmd -.->|WS Payload| Endpoint[websocket.py: websocket_endpoint]
        Endpoint --> ParseReq[Parse Patient Data]
        ParseReq --> CreateSess[(SessionRepo: create_session)]
        CreateSess --> SetFlag[State: is_recording = True]
        SetFlag --> BroadState[/State: notify_state_update/]
    end

    %% SWIMLANE: BACKEND DATA (STREAMING)
    subgraph Backend_Data [Backend: Data Handler]
        direction TB
        Incoming([Start: New Sample Stream]) --> CheckFlag{is_recording?}
        
        CheckFlag -- No --> Skip([Skip Storage])
        CheckFlag -- Yes --> Buffer["Handler: _store_recording_data()"]
        Buffer --> AddBatch[(Buffer: Append to Batch)]
        AddBatch --> BackgroundDB[(Background: Flush to DB)]
    end

    %% CONNECTIONS
    Toast --> EndUser([End])
    BroadState -.->|Update UI| Frontend
    SetFlag -.->|Controls| CheckFlag
```

---

## 3. Watchdog & Disconnect Handling (Strict Mode)
*Flow: Real-time detection of lost connection (2.0s timeout).*

```mermaid
flowchart LR
    %% SWIMLANE: BACKGROUND SERVICE
    subgraph Watchdog [App: DeviceWatchdogService]
        direction TB
        Timer([Start: Timer 0.5s])
        CheckLoop[Iterate All Devices]
        CalcDiff[Diff = Now - LastSeen]
        
        Timer --> CheckLoop --> CalcDiff
        
        IsOffline{Diff > 1.0s?}
        IsDisc{Diff > 2.0s?}
        
        CalcDiff --> IsOffline
        IsOffline -- Yes --> MarkOff[Set Status: Offline]
        
        CalcDiff --> IsDisc
        IsDisc -- Yes --> GetRecState[Get 'was_recording' State]
    end

    %% SWIMLANE: DISCONNECTION LOGIC
    subgraph Cleanup_Logic [App: Cleanup & Notify]
        direction TB
        GetRecState --> Payload[/"Construct Payload (reason, was_recording)"/]
        Payload --> Broadcast[/State: broadcast_to_device 'device_disconnected'/]
        Broadcast --> CancelRec["_cancel_device_recording()"]
        CancelRec --> WipeMem["_cleanup_device()"]
    end

    %% SWIMLANE: FRONTEND RESPONSE
    subgraph Frontend_UI [Frontend: MonitorController]
        direction TB
        Broadcast -.->|WS Event| HdlDisc[handleDeviceDisconnection]
        HdlDisc --> ResetUI[selectDevice '' -> Reset Charts]
        
        ResetUI --> CheckFlag{Payload.was_recording?}
        CheckFlag -- Yes --> Alert[/Alert: 'Recording Stopped'/]
        CheckFlag -- No --> Toast[/Toast: 'Disconnected'/]
    end
    
    WipeMem --> EndWD([End Cycle])
```

---

## 4. Device List Synchronization (Implicit Disconnect)
*Flow: Handling race conditions where Watchdog clears device before UI updates.*

```mermaid
flowchart LR
    %% SWIMLANE: BACKEND
    subgraph Backend_MQTT [App: MQTT Service]
        MsgIn([Start: Message Received]) --> CheckStatus{Status Changed?}
        CheckStatus -- Yes --> InitDev[Init Device State]
        InitDev --> SendList[/Notify: device_list_update/]
    end

    %% SWIMLANE: FRONTEND
    subgraph Frontend_Logic [Frontend: MonitorController]
        SendList -.->|WS Event| Render[renderDeviceList]
        Render --> LoopCheck{Current Device Missing?}
        
        LoopCheck -- Yes --> TriggerDisc[Trigger: handleDeviceDisconnection]
        LoopCheck -- No --> UpdateUI[Update List UI]
        
        TriggerDisc --> ResetComp[[Run Reset Sequence]]
    end
    
    ResetComp --> EndSync([End])
    UpdateUI --> EndSync
```

---

## 5. ML Analysis & Feedback Loop
*Flow: Post-processing of completed recording segments.*

```mermaid
flowchart LR
    %% SWIMLANE: TRIGGER
    subgraph Handler [App: MQTT Handler]
        SampleCount([Start: 1000 samples collected]) --> SegComp["_complete_segment()"]
        SegComp --> TrigML["ml_engine.trigger_analysis()"]
    end

    %% SWIMLANE: ML WORKER
    subgraph Worker_Thread [App: ML Engine Service]
        direction TB
        TrigML --> ThreadPool[Run in ThreadPool]
        ThreadPool --> FetchDB[(RawDataRepo: Fetch Data)]
        FetchDB --> FeatExt[[feature_extractor.extract]]
        FeatExt --> ModelPred[[Keras Model: predict]]
        ModelPred --> SaveRes[(SessionRepo: Update Result)]
    end

    %% SWIMLANE: FEEDBACK
    subgraph Feedback [App: Broadcast]
        SaveRes --> SendRes[/Broadcast: live_result/]
    end

    %% SWIMLANE: UI
    subgraph UI [Frontend: MonitorController]
        SendRes -.->|WS Event| UpdateCard[updateAICard]
        UpdateCard --> ShowBar[/Animate Confidence Bar/]
        ShowBar --> EndML([End])
    end
```

---

## 6. Authentication (Login Flow)
*Flow: User authentication and JWT Token generation.*

```mermaid
flowchart LR
    %% SWIMLANE: FRONTEND
    subgraph UI [Frontend: AuthController]
        UserLogin([Start: Click Login]) --> Payload[/Input: Email/Pass/]
        Payload --> ReqPost[/API: POST /api/v1/auth/login/]
    end

    %% SWIMLANE: BACKEND API
    subgraph API [App: Auth Endpoint]
        ReqPost -.->|HTTP Request| Route["auth.py: login_access_token"]
        Route --> AuthSvc["security.py: authenticate_user"]
        AuthSvc --> DBQuery[(UserRepo: get_by_email)]
        
        DBQuery --> Verify{Password Valid?}
        Verify -- No --> Err401([End: Return 401])
        Verify -- Yes --> CreateTok["security.py: create_access_token"]
    end

    %% SWIMLANE: RESPONSE
    subgraph Response [Frontend: Handling]
        CreateTok --> Ret200[/Return: access_token/]
        Ret200 -.->|JSON| SaveTok["Helpers.js: setToken"]
        SaveTok --> Redir([End: Redirect Dashboard])
        Err401 -.-> ShowErr[/Show Error Alert/]
    end
```

---

## 7. History Archive Retrieval
*Flow: Fetching paginated history data.*

```mermaid
flowchart LR
    %% SWIMLANE: FRONTEND
    subgraph UI [Frontend: HistoryController]
        LoadPage([Start: Page Load]) --> FetchReq["Api.js: fetch('/history')"]
    end

    %% SWIMLANE: BACKEND
    subgraph API [App: History Endpoint]
        FetchReq -.->|HTTP GET| Endpoint["history.py: read_sessions"]
        Endpoint --> RepoCall["SessionRepo: get_multi"]
        RepoCall --> DBQuery[(Database: SELECT Sessions)]
        DBQuery --> Serialize["Pydantic: SessionOut Schema"]
    end

    %% SWIMLANE: RENDER
    subgraph Render [Frontend: UI Update]
        Serialize -.->|JSON List| RecvData["HistoryController: renderTable"]
        RecvData --> DOMUpd([End: Update HTML Table])
    end
```

---

## 8. Export Data (CSV/Plot)
*Flow: Generating and downloading reports.*

```mermaid
flowchart LR
    %% SWIMLANE: FRONTEND
    subgraph UI [Frontend: HistoryController]
        ClickExp([Start: Click Export CSV]) --> ReqExp["window.open('/export/csv')"]
    end

    %% SWIMLANE: BACKEND
    subgraph API [App: Export Endpoint]
        ReqExp -.->|HTTP GET| Route["export.py: export_recording_csv"]
        Route --> FetchRaw[(RawDataRepo: get_raw_data)]
        FetchRaw --> Pandas["pd.DataFrame()"]
        Pandas --> Stream["StreamingResponse(BytesIO)"]
    end

    %% SWIMLANE: BROWSER
    subgraph Browser [Client Browser]
        Stream -.->|File Stream| Download([End: Save .csv File])
    end
```

---

## 9. Performance Monitoring Loop
*Flow: Calculating and broadcasting network metrics.*

```mermaid
flowchart LR
    %% SWIMLANE: INGESTION
    subgraph Handler [App: MQTT Handler]
        PktIn([New Packet]) --> CalcLat["Calc: Now - PacketTime"]
        CalcLat --> UpdateStat["State: latencies.append()"]
    end

    %% SWIMLANE: LOGGING
    subgraph Periodic [App: Handler Loop]
        CheckInt{Every 10 Pkts?}
        UpdateStat --> CheckInt
        CheckInt -- Yes --> CalcAgg["Calc: Avg Latency / Jitter"]
        CalcAgg --> BroadPerf[/Broadcast: performance_update/]
    end

    %% SWIMLANE: FRONTEND
    subgraph UI [Frontend: MonitorController]
        BroadPerf -.->|WS Event| RecvPerf["Socket.js: onmessage"]
        RecvPerf --> UpdateBadge([End: Update Color/Text])
    end
```