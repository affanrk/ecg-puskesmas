# System Flow Diagrams

This document outlines the core functional flows of the ECG Live Platform.

**Legend:**
- `([Start/End])`: Terminal points.
- `[Process]`: Action or processing step.
- `[/Input/Output/]`: Data I/O or User Interaction.
- `{Decision}`: Conditional logic.
- `[(Database)]`: Data storage.
- `[[Sub-process]]`: Reference to another defined process.

---

## 1. Authentication Flow

### 1.1 Registration Process

```mermaid
flowchart LR
    subgraph Frontend [Frontend Client]
        StartReg([Start]) --> InputForm[/User Fills Form/]
        InputForm --> Validate{"Validate Input?"}
        Validate -- No --> ShowErr[/Show Error/]
        ShowErr --> InputForm
        Validate -- Yes --> SendReq[/POST /register/]
    end

    subgraph Backend [Backend API]
        SendReq --> RecvReq[Receive Request]
        RecvReq --> CheckDup{"Email Exists?"}
        CheckDup -- Yes --> Ret400([Return 400])
        CheckDup -- No --> Hash[["Hash Password (Argon2)"]]
        Hash --> SaveDB[(Insert User)]
        SaveDB --> Ret200([Return 200 OK])
    end

    Ret400 -.-> ShowErr
    Ret200 -.-> ShowSuccess[/Show Success Toast/]
    ShowSuccess --> EndReg([End])
```

### 1.2 Login Process

```mermaid
flowchart LR
    subgraph Frontend [Frontend Client]
        StartLogin([Start]) --> InputCreds[/Input Email & Pass/]
        InputCreds --> SendLogin[/POST /login/]
    end

    subgraph Backend [Backend API]
        SendLogin --> FindUser{"User Exists?"}
        FindUser -- No --> Ret401([Return 401])
        FindUser -- Yes --> VerifyPass{"Verify Hash?"}
        VerifyPass -- No --> Ret401
        VerifyPass -- Yes --> GenJWT[[Generate Token]]
        GenJWT --> RetToken([Return Token])
    end

    Ret401 -.-> ShowLoginErr[/Show Error/]
    ShowLoginErr --> InputCreds
    RetToken -.-> SaveLocally[Store Token]
    SaveLocally --> RedirDash[/Redirect Dashboard/]
    RedirDash --> EndLogin([End])
```

---

## 2. Live Monitoring System

To reduce complexity, this system is split into **Data Streaming** (automatic) and **Recording Control** (manual).

### 2.1 Live Data Pipeline (Streaming)
*Flow of ECG signal data from hardware to screen.*

```mermaid
flowchart LR
    subgraph Hardware [Device]
        StartStream([Sensor Input]) --> Pkg[Packetize Data]
        Pkg --> PubMQTT[/Publish MQTT/]
    end

    subgraph Backend [Server Processing]
        PubMQTT --> RecvMQTT[MQTT Listener]
        RecvMQTT --> Jitter[[Jitter Buffer]]
        
        Jitter --> ProcessLoop{Processing}
        ProcessLoop -->|Raw| Filter[[DSP Filtering]]
        ProcessLoop -->|Raw| CalcBPM[[Calc BPM]]
        
        Filter --> AggState[Update Device State]
        CalcBPM --> AggState
        
        AggState --> CheckSocket{"Socket Open?"}
        CheckSocket -- Yes --> BroadWS[/Broadcast WebSocket/]
        CheckSocket -- No --> Drop[Drop Frame]
    end

    subgraph Frontend [Dashboard]
        BroadWS --> RecvWS[/Receive Data/]
        RecvWS --> Render[[Update Charts]]
    end
```

### 2.2 Recording Control Logic
*User interaction to Start/Stop recording sessions.*

```mermaid
flowchart LR
    subgraph Frontend [User Interface]
        StartRec([User Clicks Start]) --> InputPat[/Input Patient Data/]
        InputPat --> SendCmd[/Send WS: START_RECORDING/]
        
        RecvState[/Receive State Update/] --> UpdateUI[Lock UI & Show Timer]
    end

    subgraph Backend [Control Logic]
        SendCmd --> ValidReq{"Valid Request?"}
        ValidReq -- No --> ErrResp[/Send Error/]
        
        ValidReq -- Yes --> CreatePat[(Save Patient)]
        CreatePat --> InitSess[(Create Session)]
        InitSess --> SetFlag[Set is_recording = True]
        SetFlag --> AckOK[/Broadcast State: RECORDING/]
    end

    AckOK -.-> RecvState
    ErrResp -.-> UpdateUI
```

### 2.3 Recording Data Storage (Background)
*How data is saved when `is_recording = True`.*

```mermaid
flowchart LR
    subgraph Backend [Data Handler]
        StreamData([Incoming Stream]) --> IsRec{"is_recording?"}
        IsRec -- No --> Discard([Skip Storage])
        IsRec -- Yes --> Buffer[Add to Batch Buffer]
        
        Buffer --> CheckSeg{"Segment Full?"}
        CheckSeg -- No --> Wait[Wait for More]
        CheckSeg -- Yes --> FlushDB[(Write to DB)]
        
        FlushDB --> TriggerML[[Trigger ML Analysis]]
        TriggerML --> NewSeg[Start New Segment]
        NewSeg --> Buffer
    end
```

---

## 3. History & Analysis Review Flow

```mermaid
flowchart LR
    subgraph Frontend [User Interface]
        StartHist([Open History]) --> SetFilt[/Set Filters/]
        SetFilt --> ReqList[/GET /api/history/]
    end

    subgraph Backend [Backend API]
        ReqList --> QueryRepo[[Query Repository]]
        QueryRepo --> FetchDB[(Fetch Sessions)]
        FetchDB --> RetList([Return JSON])
    end

    RetList -.-> RenderList[/Render Table/]
    RenderList --> ClickItem[/User Selects Row/]
    ClickItem --> ReqDet["GET /api/history/{id}/"]
    ReqDet --> RetDet([Return Details])
    RetDet -.-> ViewDet[/Show Analysis & Charts/]
    ViewDet --> EndHist([End])
```

---

## 4. Data Analysis Pipeline (ML)

*Asynchronous process triggered by Segment Completion.*

```mermaid
flowchart LR
    subgraph Analysis_Service [ML Engine]
        StartML([Trigger Received]) --> FetchRaw[(Fetch Raw Data)]
        FetchRaw --> FeatExt[[Feature Extraction]]
        
        FeatExt --> CalcMet[Calc RR, PR, QT]
        FeatExt --> RunModel[[Run ANN Model]]
        
        RunModel --> Classify{"Abnormal?"}
        Classify --> Result[Set Classification]
        
        Result --> SaveRes[(Update Session Record)]
        CalcMet --> SaveRes
        SaveRes --> EndML([End])
    end
```

---

## 5. Export & Reporting Flow

```mermaid
flowchart LR
    subgraph Frontend [User Interface]
        StartExp([User Clicks Export]) --> Type{"Export Type?"}
        Type -- CSV --> ReqRaw[/GET /export/raw/]
        Type -- Chart --> ReqPlot[/GET /export/plot/]
    end

    subgraph Backend [Backend API]
        ReqRaw --> FetchDat[(Fetch Data)]
        FetchDat --> GenCSV[[Generate CSV]]
        GenCSV --> Stream1[/Stream File/]
        
        ReqPlot --> ThreadPool[Submit to ThreadPool]
        ThreadPool --> MatPlotLib[[Generate Image]]
        MatPlotLib --> Stream2[/Stream PNG/]
    end
    
    Stream1 -.-> Download1[/Download CSV/]
    Stream2 -.-> Download2[/Download PNG/]
    Download1 --> EndExp([End])
    Download2 --> EndExp
```

---

## 6. System Health & Monitoring Flow

```mermaid
flowchart LR
    subgraph Admin [Dashboard / Monitor]
        StartMon([Load Page]) --> ReqStat[/GET /monitoring/]
    end

    subgraph Backend [Backend API]
        ReqStat --> CheckConn[[Check Devices]]
        CheckConn --> CalcPerf[[Calc Latency/Loss]]
        
        CalcPerf --> CheckComp{"Components OK?"}
        CheckComp --> AggRes[Aggregate Result]
        AggRes --> RetStat([Return Status])
    end

    RetStat -.-> RenderStat[/Update Dashboard/]
    RenderStat --> EndMon([End])
```