# System Flow Documentation (Technical Swimlanes)

This document maps the architectural flows using standard flowchart notation organized into "Swimlanes" (Subsystems). It reflects the refactored project structure with distinct `frontend/` (Next.js) and `backend/` (FastAPI) applications.

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
    subgraph Backend_Service [backend: services/mqtt]
        direction TB
        RecvMsg[/handler.py: _handle_message/]
        Parse[[protocol.py: parse_packet]]
        CheckNew{New Device?}
        
        RecvMsg --> CheckNew
        CheckNew -- Yes --> NotifyList[/Notify List Update/]
        CheckNew -- No --> Parse
        
        Parse --> Process["handler.py: process_samples()"]
        Process --> Jitter["handler.py: _handle_jitter_buffer()"]
        Jitter --> LiveCalc["handler.py: _process_single_sample()"]
    end

    %% SWIMLANE: BACKEND STATE
    subgraph Backend_State [backend: services/device]
        LiveCalc --> Thrott{Throttle Limit?}
        Thrott -- Pass --> BroadWS[/state.py: broadcast_to_device/]
        Thrott -- Block --> Drop([End: Drop Frame])
    end

    %% SWIMLANE: FRONTEND
    subgraph Frontend [frontend: UI]
        direction TB
        BroadWS -.->|WS: live_data| SocketRx[/services/socket.ts: onmessage/]
        SocketRx --> EvBus[services/events.ts: globalEventBus emit 'chart:ecg_data']
        EvBus --> Chart["components/monitor/ECGChart.tsx: Chart.js update"]
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
    subgraph Frontend [frontend: User Action]
        direction TB
        UserStart([Start: Click 'Start Session'])
        ValInput{Valid Input?}
        
        UserStart --> ValInput
        ValInput -- No --> Toast[/useToast: show error/]
        ValInput -- Yes --> SendCmd[/services/socket.ts: sendJson 'start_recording'/]
    end

    %% SWIMLANE: BACKEND CONTROL (API)
    subgraph Backend_Control [backend: api/v1/endpoints]
        direction TB
        SendCmd -.->|WS Payload| Endpoint[websocket.py: websocket_endpoint]
        Endpoint --> ParseReq[Parse Patient Data]
        ParseReq --> CreateSess[(repositories/session.py: SessionRepository.create_session)]
        CreateSess --> SetFlag[services/device/state.py: is_recording = True]
        SetFlag --> BroadState[/state.py: notify_state_update/]
    end

    %% SWIMLANE: BACKEND DATA (STREAMING)
    subgraph Backend_Data [backend: services/recording]
        direction TB
        Incoming([Start: New Sample Stream]) --> CheckFlag{is_recording?}
        
        CheckFlag -- No --> Skip([Skip Storage])
        CheckFlag -- Yes --> Buffer["storage.py: _store_recording_data()"]
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
    subgraph Watchdog [backend: services/device]
        direction TB
        Timer([Start: watchdog.py Timer 0.5s])
        CheckLoop[Iterate All Devices]
        CalcDiff[Diff = Now - LastSeen]
        
        Timer --> CheckLoop --> CalcDiff
        
        IsOffline{Diff > 1.0s?}
        IsDisc{Diff > 2.0s?}
        
        CalcDiff --> IsOffline
        IsOffline -- Yes --> MarkOff[Set Status: Offline]
        IsOffline -- No --> Cont1[Continue]
        
        CalcDiff --> IsDisc
        IsDisc -- Yes --> GetRecState[Get 'was_recording' State]
        IsDisc -- No --> Cont2[Continue]
    end

    %% SWIMLANE: DISCONNECTION LOGIC
    subgraph Cleanup_Logic [backend: state.py cleanup]
        direction TB
        GetRecState --> Payload[/"Construct Payload (reason, was_recording)"/]
        Payload --> Broadcast[/state.py: broadcast_to_device 'device_disconnected'/]
        Broadcast --> CancelRec["_cancel_device_recording()"]
        CancelRec --> WipeMem["_cleanup_device()"]
    end

    %% SWIMLANE: FRONTEND RESPONSE
    subgraph Frontend_UI [frontend: useStore/socket.ts]
        direction TB
        Broadcast -.->|WS Event| HdlDisc[socket.ts: handleMessage 'device_disconnected']
        HdlDisc --> ResetUI[useStore.ts: setDeviceId null -> Clear UI]
        
        ResetUI --> CheckFlag{Payload.was_recording?}
        CheckFlag -- Yes --> Alert[/useToast: 'Recording Stopped'/]
        CheckFlag -- No --> Toast[/useToast: 'Disconnected'/]
    end
    
    WipeMem --> EndWD([End Cycle])
```

---

## 4. Device List Synchronization (Implicit Disconnect)
*Flow: Handling race conditions where Watchdog clears device before UI updates.*

```mermaid
flowchart LR
    %% SWIMLANE: BACKEND
    subgraph Backend_MQTT [backend: services/mqtt/handler.py]
        MsgIn([Start: Message Received]) --> CheckStatus{Status Changed?}
        CheckStatus -- Yes --> InitDev[Init Device State]
        InitDev --> SendList[/Notify: device_list_update/]
        CheckStatus -- No --> Ignore([Ignore Update])
    end

    %% SWIMLANE: FRONTEND
    subgraph Frontend_Logic [frontend: useStore / useDeviceManager]
        SendList -.->|WS Event| Render[useStore: setDevices]
        Render --> LoopCheck{Current Device Missing?}
        
        LoopCheck -- Yes --> TriggerDisc[socket.ts: handleMessage 'device_disconnected']
        LoopCheck -- No --> UpdateUI[UI: DeviceDropdown Update]
        
        TriggerDisc --> ResetComp[[useStore: resetSession]]
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
    subgraph Handler [backend: services/mqtt/handler.py]
        SampleCount([Start: 1000 samples collected]) --> SegComp["_complete_segment()"]
        SegComp --> TrigML["services/analysis/ml_engine.py: trigger_analysis()"]
    end

    %% SWIMLANE: ML WORKER
    subgraph Worker_Thread [backend: services/analysis]
        direction TB
        TrigML --> ThreadPool[Run in ThreadPool]
        ThreadPool --> FetchDB[(repositories/session.py: RawDataRepository.get_raw_data)]
        FetchDB --> FeatExt[[feature_extractor.py: extract]]
        FeatExt --> ModelPred[[Keras Model: predict]]
        ModelPred --> SaveRes[(repositories/session.py: SessionRepository.update_analysis_results)]
    end

    %% SWIMLANE: FEEDBACK
    subgraph Feedback [backend: state.py]
        SaveRes --> SendRes[/Broadcast: live_result/]
    end

    %% SWIMLANE: UI
    subgraph UI [frontend: AIAnalysisCard.tsx]
        SendRes -.->|WS Event| UpdateStore[useStore: addLiveResult]
        UpdateStore --> ShowUI[AIAnalysisCard: Render Classification]
        ShowUI --> ShowBar[/Animate Confidence Bar/]
        ShowBar --> EndML([End])
    end
```

---

## 6. Authentication: Login Flow
*Flow: User authentication and JWT Token generation.*

```mermaid
flowchart LR
    %% SWIMLANE: FRONTEND
    subgraph UI [frontend: /login/page.tsx]
        UserLogin([Start: Click Login]) --> Payload[/Input: Email/Pass/]
        Payload --> ReqPost[/API: POST /api/v1/auth/login/]
    end

    %% SWIMLANE: BACKEND API
    subgraph API [backend: api/v1/endpoints/auth.py]
        ReqPost -.->|HTTP Request| Route["auth.py: login"]
        Route --> AuthSvc["core/security.py: authenticate_user"]
        AuthSvc --> DBQuery[(repositories/user.py: UserRepository.get_by_email)]
        
        DBQuery --> Verify{Password Valid?}
        Verify -- No --> Err401([End: Return 401])
        Verify -- Yes --> CreateTok["core/security.py: create_access_token"]
    end

    %% SWIMLANE: RESPONSE
    subgraph Response [frontend: Handling]
        CreateTok --> Ret200[/Return: access_token/]
        Ret200 -.->|JSON| SaveTok["localStorage.setItem('ecg_token')"]
        SaveTok --> Redir([End: Redirect /monitor])
        Err401 -.-> ShowErr[/useToast: show error/]
    end
```

---

## 7. Authentication: Registration Flow
*Flow: New user signup and database insertion.*

```mermaid
flowchart LR
    %% SWIMLANE: FRONTEND
    subgraph UI [frontend: /register/page.tsx]
        UserReg([Start: Click Register]) --> InputData[/Input: Email/Pass/Name/]
        InputData --> ClientVal{Zod Validation?}
        ClientVal -- Fail --> ShowToast[/UI Error Message/]
        ClientVal -- Pass --> ReqReg[/API: POST /api/v1/auth/register/]
    end

    %% SWIMLANE: BACKEND API
    subgraph API [backend: api/v1/endpoints/auth.py]
        ReqReg -.->|HTTP Request| Route["auth.py: register"]
        Route --> CheckDup[(repositories/user.py: UserRepository.get_by_email)]
        CheckDup --> Exists{Email Exists?}
        
        Exists -- Yes --> Err400([End: Return 400])
        Exists -- No --> Hash["core/security.py: get_password_hash"]
        Hash --> Insert[(UserRepository.create)]
    end

    %% SWIMLANE: RESPONSE
    subgraph Response [frontend: Handling]
        Insert --> Ret200[/Return: User Schema/]
        Ret200 -.->|JSON| SuccessToast[/useToast: Registration Successful/]
        SuccessToast --> NavLogin([End: Navigate to /login])
        Err400 -.-> ShowToast
    end
```

---

## 8. History: Archive Retrieval
*Flow: Fetching paginated history data.*

```mermaid
flowchart LR
    %% SWIMLANE: FRONTEND
    subgraph UI [frontend: services/api.ts]
        LoadPage([Start: Page Load]) --> FetchReq["api.ts: fetchHistory()"]
    end

    %% SWIMLANE: BACKEND
    subgraph API [backend: api/v1/endpoints/history.py]
        FetchReq -.->|HTTP GET| Endpoint["history.py: read_sessions"]
        Endpoint --> RepoCall["repositories/session.py: SessionRepository.search_sessions"]
        RepoCall --> DBQuery[(Database: SELECT Sessions JOIN Patients)]
        DBQuery --> Serialize["schemas/session.py: SessionResponse"]
    end

    %% SWIMLANE: RENDER
    subgraph Render [frontend: UI Update]
        Serialize -.->|JSON List| RecvData["History View: Table Render"]
        RecvData --> DOMUpd([End: Update Next.js Table])
    end
```

---

## 9. History: Detail View & Charts
*Flow: Viewing deep analytics for a specific session.*

```mermaid
flowchart LR
    %% SWIMLANE: FRONTEND
    subgraph UI [frontend: components/shared/PatientModal.tsx]
        ClickRow([Start: Click Table Row]) --> ReqDet["api.ts: fetchSessionDetails()"]
    end

    %% SWIMLANE: BACKEND
    subgraph API [backend: api/v1/endpoints/history.py]
        ReqDet -.->|HTTP GET| Endpoint["history.py: read_session"]
        Endpoint --> FetchSess[(SessionRepository.get_by_recording_id)]
        FetchSess --> FetchRaw[(RawDataRepository.get_by_session)]
        FetchRaw --> Combine[Combine Session + Analysis + Raw]
    end

    %% SWIMLANE: RENDER
    subgraph Frontend_Modal [frontend: PatientModal]
        Combine -.->|JSON Detail| OpenMod["PatientModal: Render Props"]
        OpenMod --> RenderChart["ECGChart: Render Static Segment"]
        RenderChart --> View([End: View Details])
    end
```

---

## 10. Export Data (CSV & Plot)
*Flow: Generating and downloading reports.*

```mermaid
flowchart LR
    %% SWIMLANE: FRONTEND
    subgraph UI [frontend: services/api.ts]
        ClickExp([Start: Click Export]) --> Type{"Export Type?"}
        Type -- CSV --> ReqCSV["api.ts: downloadRecording('raw')"]
        Type -- Chart --> ReqPlot["api.ts: downloadRecording('plot')"]
    end

    %% SWIMLANE: BACKEND API
    subgraph API [backend: api/v1/endpoints/export.py]
        ReqCSV -.->|HTTP GET| EndCSV["export.py: export_raw_ecg_data"]
        EndCSV --> FetchRaw[(RawDataRepository.get_raw_data)]
        FetchRaw --> Pandas["pd.DataFrame()"]
        Pandas --> StreamCSV["StreamingResponse(BytesIO)"]

        ReqPlot -.->|HTTP GET| EndPlot["export.py: export_ecg_chart"]
        EndPlot --> ExecPool[Run in ThreadPool]
        ExecPool --> MatPlot[[services/export/plot_generator.py: generate_ecg_plot]]
        MatPlot --> StreamPNG["StreamingResponse(BytesIO)"]
    end

    %% SWIMLANE: BROWSER
    subgraph Browser [Client Browser]
        StreamCSV -.->|File Stream| DownloadCSV([End: Save .csv])
        StreamPNG -.->|File Stream| DownloadPNG([End: Save .png])
    end
```

---

## 11. Performance Monitoring (Per Device)
*Flow: Calculating and broadcasting network metrics.*

```mermaid
flowchart LR
    %% SWIMLANE: INGESTION
    subgraph Handler [backend: services/mqtt/handler.py]
        PktIn([New Packet]) --> CalcLat["Calc: Now - PacketTime"]
        CalcLat --> UpdateStat["State: Update Device Performance State"]
    end

    %% SWIMLANE: LOGGING
    subgraph Periodic [backend: services/mqtt/handler.py]
        CheckInt{Every 10 Pkts?}
        UpdateStat --> CheckInt
        CheckInt -- Yes --> CalcAgg["Calc: Avg Latency / Jitter"]
        CheckInt -- No --> Continue([Continue])
        
        CalcAgg --> BroadPerf[/Broadcast: performance_update/]
    end

    %% SWIMLANE: FRONTEND
    subgraph UI [frontend: useStore / PerformancePage.tsx]
        BroadPerf -.->|WS Event| RecvPerf["socket.ts: handleMessage 'performance_update'"]
        RecvPerf --> UpdateStore["useStore: updatePerformance"]
        UpdateStore --> UpdateUI([End: Render Jitter/Latency Charts])
    end
```
