# System Flow Diagrams

This document outlines the core functional flows of the ECG Live Platform, including authentication, real-time monitoring, recording, data processing, and historical review.

## 1. Authentication Flow

This section details the Registration and Login processes.

### Registration Process

```mermaid
flowchart LR
    subgraph Frontend [Frontend]
        StartReg([Start Registration]) --> FillForm[Fill Registration Form]
        FillForm --> ValidateForm{"Validate Input"}
        ValidateForm -- Invalid --> ShowFormError[Show Error Message]
        ShowFormError --> FillForm
        ValidateForm -- Valid --> SendRegReq[POST /api/auth/register]
        RecvRegRes{"Receive Response"} -->|Success| ShowSuccess[Show Success Toast]
        RecvRegRes -->|Error| ShowApiError[Show API Error]
        ShowSuccess --> RedirectLogin[Redirect to Login]
        ShowApiError --> FillForm
    end

    subgraph Backend [Backend API]
        SendRegReq --> API_Reg[Receive Request]
        API_Reg --> ValidateSchema{"Validate Schema"}
        ValidateSchema -- Invalid --> Ret422[Return 422 Unprocessable Entity]
        ValidateSchema -- Valid --> CheckEmail{"Check Email Exists"}
        CheckEmail -- Yes --> Ret400[Return 400 Email Registered]
        CheckEmail -- No --> HashPwd[Hash Password with Argon2]
        HashPwd --> SaveUser[Save User to DB]
        SaveUser --> Ret200[Return 200 OK]
    end

    Ret422 -.-> RecvRegRes
    Ret400 -.-> RecvRegRes
    Ret200 -.-> RecvRegRes
```

### Login Process

```mermaid
flowchart LR
    subgraph Frontend [Frontend]
        StartLogin([Start Login]) --> FillLogin[Fill Email & Password]
        FillLogin --> SendLoginReq[POST /api/auth/login]
        RecvLoginRes{"Receive Response"} -->|Success| StoreToken[Store Token in LocalStorage]
        RecvLoginRes -->|Error| ShowLoginError[Show 'Incorrect email/password']
        StoreToken --> RedirectDash[Redirect to Dashboard]
        ShowLoginError --> FillLogin
    end

    subgraph Backend [Backend API]
        SendLoginReq --> API_Login[Receive Credentials]
        API_Login --> FindUser{"Find User by Email"}
        FindUser -- Not Found --> Ret401[Return 401 Unauthorized]
        FindUser -- Found --> VerifyPwd{"Verify Password (Argon2)"}
        VerifyPwd -- Invalid --> Ret401
        VerifyPwd -- Valid --> GenJWT[Generate JWT Token]
        GenJWT --> RetToken[Return 200 OK + Token]
    end

    Ret401 -.-> RecvLoginRes
    RetToken -.-> RecvLoginRes
```

---

## 2. Live Monitoring & Recording Flow

This flow describes how ECG data moves from the hardware device to the user's screen and how recording sessions are managed.

```mermaid
flowchart LR
    subgraph Hardware [ECG Device]
        GenData([Generate ECG Signal]) --> PkgData[Packetize Data]
        PkgData --> SendMQTT[Publish to MQTT Topic]
    end

    subgraph Backend [Backend Service]
        recvMQTT[MQTT Listener] -->|Raw Packets| JitterBuf[Jitter Buffer]
        JitterBuf -->|Ordered Samples| SignalProc[Signal Processor]
        
        SignalProc -->|Filtered Data| WSBroad[Broadcast to WebSocket]
        SignalProc -->|Raw Data| BPMEng[BPM Calculator]
        BPMEng --> WSBroad
        
        WSBroad -->|Throttled Update| WSServer[WebSocket Server]
        
        SignalProc --> CheckRec{Is Recording?}
        CheckRec -- Yes --> BatchStore[Batch Storage Buffer]
        BatchStore -->|Periodically| DBWrite[(Database)]
        
        BatchStore --> CheckSeg{Segment Full?}
        CheckSeg -- Yes --> TrigML[Trigger ML Analysis]
        TrigML --> NewSeg[Start New Segment]
        
        RecCmd[Receive Start Command] --> CreatePat[Create/Update Patient]
        CreatePat --> CreateSess[Create Session]
        CreateSess --> SetFlag[Set is_recording = True]
    end

    subgraph Frontend [User Interface]
        UserOpen[Open Monitor Page] --> WSConn[Connect WebSocket]
        WSConn -->|Subscribed| RecvLive[Receive Live Data]
        RecvLive --> UpdateChart[Update ECG Charts]
        
        UserStart[Click 'Start Recording'] --> SendStart[Send START Command]
        SendStart --> WSServer
        
        RecvProg[Receive Progress] --> UpdateProg[Update Progress Bar]
        WSServer --> RecvProg
    end

    SendMQTT --> recvMQTT
    WSServer --> RecvLive
    SetFlag -.-> CheckRec
```

---

## 3. History & Analysis Review Flow

This flow illustrates how users retrieve past recordings and view analysis results.

```mermaid
flowchart LR
    subgraph Frontend [User Interface]
        NavHist[Navigate to History] --> FillFilter[Set Filters (Date, Patient)]
        FillFilter --> ReqList[GET /api/history]
        
        RecvList[Render List] --> ClickItem[Select Recording]
        ClickItem --> ReqDetail[GET /api/history/{id}]
        
        RecvDetail[Render Detail] --> ViewRes[View Classification & Metrics]
    end

    subgraph Backend [Backend API]
        ReqList --> SearchRepo[SessionRepo.search_sessions]
        SearchRepo --> QueryDB[(Database)]
        QueryDB -->|Results| SearchRepo
        SearchRepo --> RetList[Return Session List]
        
        ReqDetail --> GetRepo[SessionRepo.get_by_id]
        GetRepo --> QueryDBDetail[(Database)]
        QueryDBDetail -->|Session + Patient| GetRepo
        GetRepo --> RetDetail[Return Session Details]
    end
    
    RetList -.-> RecvList
    RetDetail -.-> RecvDetail
```

---

## 4. Data Analysis Pipeline (ML)

Triggered automatically when a recording segment completes.

```mermaid
flowchart LR
    subgraph Service [Analysis Service]
        Trigger([Segment Complete]) --> FetchData[Fetch Recording Data]
        FetchData --> FeatExt[Feature Extraction]
        FeatExt -->|RR, PR, QT Intervals| MLModel[ML Model (ANN)]
        
        MLModel -->|Classify| Result{Abnormal?}
        Result -->|Yes/No| SaveRes[Save Classification]
        
        FeatExt --> SaveMetrics[Save Interval Metrics]
        
        SaveRes --> UpdateDB[(Database)]
        SaveMetrics --> UpdateDB
    end
```

---

## 5. Export & Reporting Flow

Processes for downloading data and generating reports.

```mermaid
flowchart LR
    subgraph Frontend [User Interface]
        ClickExpRaw[Click 'Export CSV'] --> ReqRaw[GET /export/raw/{id}]
        ClickExpChart[Click 'Export Chart'] --> ReqChart[GET /export/plot/{id}]
        ClickExpFeat[Click 'Export Features'] --> ReqFeat[GET /export/features/{id}]
    end

    subgraph Backend [Backend API]
        ReqRaw --> FetchRaw[Fetch Raw Data]
        FetchRaw --> GenCSV[Generate CSV]
        GenCSV --> StreamRaw[Stream File]
        
        ReqChart --> GenPlot[Generate Plot (Thread Pool)]
        GenPlot --> DrawWave[Draw Waveforms]
        DrawWave --> StreamImg[Stream PNG]
        
        ReqFeat --> FetchFeat[Fetch Features]
        FetchFeat --> GenFeatCSV[Generate CSV]
        GenFeatCSV --> StreamFeat[Stream File]
    end
    
    StreamRaw -.-> ClickExpRaw
    StreamImg -.-> ClickExpChart
    StreamFeat -.-> ClickExpFeat
```

---

## 6. System Health & Monitoring Flow

Continuous monitoring of system status and performance.

```mermaid
flowchart LR
    subgraph Frontend [Dashboard / Admin]
        PageLoad[Load Dashboard] --> ReqHealth[GET /monitoring/devices]
        AdminCheck[Admin Check] --> ReqDetailed[GET /health/detailed]
    end

    subgraph Backend [Backend API]
        ReqHealth --> AggState[Aggregate Device States]
        AggState --> CalcPerf[Calculate Real-time Perf]
        CalcPerf --> RetDevStats[Return Device Status]
        
        ReqDetailed --> CheckDB[Ping Database]
        CheckDB --> CheckMQTT[Check MQTT Status]
        CheckMQTT --> CheckML[Verify ML Model]
        CheckML --> RetSysHealth[Return System Health]
    end
    
    RetDevStats -.-> PageLoad
    RetSysHealth -.-> AdminCheck
```