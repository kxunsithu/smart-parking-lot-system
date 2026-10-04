# Smart Parking Lot System - AI Camera Slot Detection System (အသေးစိတ် ရှင်းလင်းချက် စာရွက်စာတမ်း)

ဤစာရွက်စာတမ်းသည် **Smart Parking Lot Management System** တွင် ပါဝင်သော **AI Camera Slot Detection & Live Floor Map Feature** ၏ နည်းပညာအသေးစိတ်၊ အလုပ်လုပ်ပုံအဆင့်ဆင့်၊ Architecture ပုံစံ တွဲဖက်ထားမှုနှင့် လုံခြုံရေး စည်းမျဉ်းများကို မြန်မာဘာသာဖြင့် ပြည့်စုံစွာ ရှင်းလင်းရေးသားထားခြင်း ဖြစ်ပါသည်။

---

## 1. နိဒါန်း (Overview & System Objectives)

Smart Parking System တွင် Parking Staff သို့မဟုတ် Lot Owner များအနေဖြင့် Parking Slot များ၏ အခြေအနေ (`AVAILABLE` / `OCCUPIED`) ကို Manual လိုက်လံ စစ်ဆေးကြည့်ရှုခြင်း သို့မဟုတ် ဖုန်းမှ တစ်ခုချင်းစီ လိုက်လံ နှိပ်ပေးနေစရာ မလိုဘဲ -
1. Website ပေါ်ရှိ **"Scan Floor Camera"** Button ကို နှိပ်လိုက်သည်နှင့် Live Web Camera Feed ပွင့်လာမည် ဖြစ်ပါသည်။
2. AI Object Detection Model မှ ကား ရပ်ထားခြင်း ရှိ/မရှိ ကို Real-time Detected ပြုလုပ်ပေးမည် ဖြစ်ပါသည်။
3. ရရှိလာသော Slot Status များကို 3D View Floor Plan Diagram နှင့် ၁၀၀% ကိုက်ညီသော Visual Overlay ဖြင့် ပြသပေးပြီး Database သို့ အလိုအလျောက် သို့မဟုတ် တစ်ချက်နှိပ်ရုံဖြင့် Sync လုပ်ပေးနိုင်ပါသည်။

---

## 2. အသုံးပြုထားသော နည်းပညာများနှင့် Architecture (Tech Stack & Architecture)

```mermaid
graph TD
    A[User Web Browser] -->|HTML5 getUserMedia| B[Live Camera Feed]
    B -->|TensorFlow.js / MobileNet| C[Client-side AI Engine]
    C -->|Coordinate Overlap Math| D[3D-Matched Canvas Overlay]
    D -->|Status Payload| E[FastAPI Backend /api/v1/camera/detect]
    E -->|Reserved Protection Rules| F[(PostgreSQL Database)]
```

| Component / Layer | အသုံးပြုထားသော နည်းပညာများ | သုံးစွဲထားသည့် အခန်းကဏ္ဍ |
| :--- | :--- | :--- |
| **Frontend UI** | React, TypeScript, Tailwind CSS, Lucide Icons | Modal Interface, Controls, Fullscreen Mode, Auto-sync Switch |
| **Video & WebCam** | HTML5 Media Capture API (`navigator.mediaDevices`) | Browser WebCam, Laptop Camera, USB External Webcam, DroidCam ရယူခြင်း |
| **Client-side AI Engine** | TensorFlow.js (`@tensorflow/tfjs`), COCO-SSD (`@tensorflow-models/coco-ssd`) | Browser ထဲတွင် တိုက်ရိုက် ကား/ယာဉ်များ (`car`, `motorcycle`, `bus`, `truck`) ကို အခမဲ့ Detect လုပ်ခြင်း |
| **Graphics & Canvas** | HTML5 Canvas 2D API (`CanvasRenderingContext2D`) | 3D Floor Plan Layout အတိုင်း ထောင်လိုက် White Slot Frames & Dashed Driving Lanes ရေးဆွဲပေးခြင်း |
| **Backend API** | FastAPI, Python 3.11, Pydantic, SQLAlchemy | `CameraDetectionService` မှတစ်ဆင့် DB State Update ပြုလုပ်ခြင်း |
| **Optional Hardware Daemon** | OpenCV, Ultralytics YOLOv8, Python `detector.py` | 24/7 သီးသန့် တပ်ဆင်ထားသော CCTV IP Cameras များအတွက် (Optional) |

---

## 3. 3D View Floor Plan Matching Architecture (3D ပုံစံအတိုင်း ကိုက်ညီအောင် ပြင်ဆင်ထားမှု)

စကင်ဖတ်သည့် Map visual သည် စနစ်၏ **3D View Floor Page** နှင့် ၁၀၀% Match ဖြစ်စေရန် အောက်ပါ အစိတ်အပိုင်းများကို Canvas ပေါ်တွင် Vector Graphics အဖြစ် Dynamic ရေးဆွဲထားပါသည်။

### (က) Portrait Vertical Slot Frames (ထောင်လိုက် Slot အကွက်များ)
- Horizontal အကွက်များအစား 3D View အတိုင်း **Portrait ( height > width, Ratio ≈ 1:1.4)** လေးထောင့်ကွက်များအဖြစ် စီစဉ်ပေးထားပါသည်။
- Slot အရေအတွက်အပေါ် မူတည်၍ 1 Row တွင် 3 ကွက်မှ 5 ကွက်အထိ Grid Column များကို တွက်ချက်ပေးပါသည်။

### (ခ) Solid White Rectangular Frame Border (အဖြူရောင် ဘောင်လိုင်း)
- Slot အကွက်တစ်ခုစီ၏ ပတ်ပတ်လည်တွင် 3D View ၏ Slot Pad Frame အတိုင်း **ထင်ရှားသော Solid White Border Line (`#ffffff`)** ဖြင့် ရေးဆွဲပေးထားပါသည်။
- User မှ Slot တစ်ခုကို နှိပ်လိုက်ပါက ၎င်း Slot ဘောင်သည် Amber (`#f59e0b`) အရောင်သို့ ပြောင်းလဲသွားပါသည်။

### (ဂ) Dashed White Center Driving Lanes (အဖြူရောင် မောင်းလမ်း မျဉ်းပြတ်များ)
- Parking Slot တန်းများ (Rows) ၏ ကြားတွင် ကားမောင်းလမ်း (Driving Aisles) များကို ရေးဆွဲထားပြီး၊ လမ်း၏ လယ်ခေါင်တွင် **အဖြူရောင် မျဉ်းပြတ်များ (`- - - - - - -`)** ကို `ctx.setLineDash([16, 12])` ဖြင့် အတိအကျ ထည့်သွင်းထားပါသည်။

### (ဃ) Centered Crisp White Slot Label Text (စာလုံးဖြူ အလယ်ဗဟို စာသား)
- Slot တစ်ခုစီ၏ နံပါတ် (ဥပမာ - `G-A01`, `L1-A02`) ကို Slot အကွက်၏ ဗဟိုတည့်တည့် (`rx + rw/2, ry + rh/2`) တွင် စာလုံးဖြူ ရဲရဲကြီးဖြင့် ရှင်းလင်းစွာ ရေးဆွဲပေးထားပါသည်။

### (င) Status Translucent Color Fill (အရောင်ခွဲခြားမှု)
- **AVAILABLE (လွတ်နေသည်):** Translucent Dark Slate / Green Tint (`rgba(51, 65, 85, 0.55)`)
- **OCCUPIED (ကားရပ်ထားသည်):** Red Tint (`rgba(225, 29, 72, 0.40)`)
- **RESERVED (ကြိုတင် Booking ယူထားသည်):** Amber Tint (`rgba(217, 119, 6, 0.35)`)

---

## 4. Full Screen Camera Scanning Feature (မျက်နှာပြင်ပြည့် စကင်ဖတ်သည့်စနစ်)

ကျယ်ပြန့်သော Parking Lot များနှင့် မျက်နှာပြင်ကြီးမားသည့် Monitor / Tablet များတွင် အသုံးပြုနိုင်ရန် **Full Screen Scanning Mode** ကို ထည့်သွင်းထားပါသည်။

### 🛠️ နည်းပညာဆိုင်ရာ တည်ဆောက်ပုံ (Implementation Details):
1. **Document-Level Page Fullscreen**:
   - `document.documentElement.requestFullscreen()` ကို အသုံးပြု၍ Browser တစ်ခုလုံးကို Fullscreen Mode သို့ ပြောင်းလဲပေးပါသည်။
2. **Radix UI Dialog Override**:
   - Modal ၏ မူလ Translate Transform များကို ဖျက်ပစ်ပြီး `!fixed !inset-0 !top-0 !left-0 !transform-none !w-screen !h-screen !z-[999999]` CSS သုံး၍ Screen တစ်ခုလုံးသို့ 100% ရောက်ရှိစေပါသည်။
3. **Dynamic Responsive Canvas Resizing**:
   - Canvas ၏ Resolution ကို `video.getBoundingClientRect()` မှ ရရှိသော Width/Height အတိုင်း Dynamic Sync ပြုလုပ်ပေးသဖြင့် Fullscreen တွင် ပုံရိပ်များ ဝါးသွားခြင်း သို့မဟုတ် ကွက်လပ် မည်းသွားခြင်း လုံးဝ မရှိပါ။
4. **Control Buttons**:
   - Modal Header ရှိ **`[ Fullscreen ]`** Button နှင့် Camera Toolbar အောက်ခြေရှိ Icon ခလုတ်တို့မှတစ်ဆင့် အလွယ်တကူ ဖွင့်/ပိတ် ပြုလုပ်နိုင်ပြီး **`ESC`** Key ကို နှိပ်၍လည်း မူလအတိုင်း ပြန်ထွက်နိုင်ပါသည်။

---

## 5. Client-side AI Engine (အသေးစိတ် နည်းပညာစနစ်နှင့် အလုပ်လုပ်ပုံ)

**Client-side AI Engine** ဆိုသည်မှာ AI Model ဖြင့် ရုပ်ပုံစကင်ဖတ်ခြင်း (Object Detection Logic) ကို Backend Python Server သို့မဟုတ် Cloud AI Service (OpenAI, Google Cloud Vision) သို့ ပို့စရာမလိုဘဲ၊ **အသုံးပြုသူ၏ Web Browser (Chrome, Safari, Edge) ထဲတွင် တိုက်ရိုက် တွက်ချက်ခိုင်းသော နည်းပညာ** ဖြစ်ပါသည်။

### (က) အသုံးပြုထားသော Core Stack
1. **TensorFlow.js (`@tensorflow/tfjs`)**:
   - Browser ၏ **WebGL / WebGPU Hardware Acceleration (Graphics Card)** ကို တိုက်ရိုက် အသုံးပြု၍ AI Model များကို အရှိန်အဟုန်မြှင့် စကင်ဖတ်ပေးပါသည်။
2. **COCO-SSD Model (`@tensorflow-models/coco-ssd`)**:
   - Single Shot MultiBox Detector Architecture ပေါ်တွင် အခြေခံထားပြီး **`lite_mobilenet_v2`** model ကို အသုံးပြုထားပါသဖြင့် Browser Memory (RAM) စားသုံးမှု အလွန်သက်သာပါသည်။

### (ခ) Step-by-Step Technical Workflow
1. **AI Model Loading**:
   - Modal စတင်ဖွင့်လှစ်သည်နှင့် `cocoSsd.load({ base: "lite_mobilenet_v2" })` ဖြင့် AI Model ၏ Weights များကို Browser Memory ထဲသို့ တစ်ကြိမ်သာ ဒေါင်းလုဒ်ဆွဲ၍ သိမ်းဆည်းလိုက်ပါသည်။
2. **Video Frame Capture**:
   - HTML5 `<video>` element မှ ရိုက်ကူးနေသော Live Stream မှ ရုပ်ပုံ Frame များကို 2 စက္ကန့်တစ်ကြိမ် `model.detect(video, 10, 0.35)` ဖြင့် AI Detector ထဲသို့ ထည့်ပေးပါသည်။
3. **Vehicle Class Filtering**:
   - COCO-SSD မှ မော်တော်ယာဉ် ၄ မျိုးကိုသာ စစ်ထုတ် (Filter) ပါသည် -
     ```typescript
     const VEHICLE_CLASSES = ["car", "truck", "bus", "motorcycle"];
     ```
4. **Slot ROI Overlap Math (ဗဟိုမှတ် တိုက်ဆိုင်တွက်ချက်ခြင်း)**:
   - တွေ့ရှိသော ကား Bounding Box `[vx, vy, vw, vh]` ၏ ဗဟိုမှတ် (Center Point) ကို တွက်ချက်ပါသည် -
     $$\text{cx} = \text{vx} + \frac{\text{vw}}{2}, \quad \text{cy} = \text{vy} + \frac{\text{vh}}{2}$$
   - ထို ဗဟိုမှတ် `(cx, cy)` သည် Parking Slot ၏ လေးထောင့်ကွက် (ROI Rectangle) ထဲတွင် ကျရောက်နေပါက `OCCUPIED`၊ မကျရောက်ပါက `AVAILABLE` ဟု ဆုံးဖြတ်ပါသည်။

### (ဂ) Client-side AI Engine ၏ အဓိက အားသာချက်များ
- 💰 **၁၀၀% Free (လုံးဝ အခမဲ့):** Cloud AI API Fee ကြေးများ လုံးဝ ပေးရန် မလိုပါ။
- ⚡ **Zero Server CPU Load:** AI Detection တွက်ချက်မှုအားလုံးကို Browser မှ လုပ်ဆောင်သဖြင့် Backend FastAPI Server လေးသွားခြင်း မရှိပါ။
- 🔒 **High Privacy & Security:** Camera Video Feed များကို Internet ပေါ်သို့ ပို့ရန်မလိုဘဲ အသုံးပြုသူ၏ စက်ထဲတွင်သာ Process လုပ်သဖြင့် Privacy အပြည့်အဝ ရှိပါသည်။

---

## 6. Safe Database Protection Rules (အတင်း Overwrite မလုပ်စေရန် ကာကွယ်မှုများ)

Backend API ၏ `CameraDetectionService` တွင် အောက်ပါ စည်းမျဉ်း (Rules) များကို မဖြစ်မနေ လိုက်နာစေရန် ရေးဆွဲထားပါသည်။

1. **Rule 1 - Reserved Slot Protection (အရေးကြီးဆုံး)**:
   - Slot ၏ လက်ရှိ Status သည် **`RESERVED`** (Customer မှ App မှတစ်ဆင့် Booking ယူထားသောအဆင့်) ဖြစ်နေပါက Camera Detection မှ ၎င်း Slot ကို Absolute Overwrite ပြုလုပ်ခွင့် မရှိပါ။ Booking စနစ် မပျက်စီးစေရန် ကာကွယ်ပေးထားပါသည်။
2. **Rule 2 - Change Detection Throttling**:
   - Slot Status ပြောင်းလဲမှု (ဥပမာ `AVAILABLE` -> `OCCUPIED`) ရှိမှသာ Database Write Operation ပြုလုပ်ပါသည်။
3. **Rule 3 - Auto-Sync Mode**:
   - **Auto-Sync** ကို On ထားပါက 4 စက္ကန့်တစ်ကြိမ် DB သို့ အလိုအလျောက် Update ပို့ပေးပြီး၊ Off ထားပါက **"Apply to Database"** Button ကို နှိပ်မှသာ Batch Update လုပ်ဆောင်မည် ဖြစ်ပါသည်။

---

## 7. အသုံးပြုပုံ Step-by-Step လမ်းညွှန် (Usage Guide)

1. **Slots Board / Floor Detail Page သို့သွားပါ**:
   - Parking Staff သို့မဟုတ် Owner Account ဖြင့် Login ဝင်၍ Slots Board သို့ သွားပါ။
2. **"Scan Floor Camera" ခလုတ်ကို နှိပ်ပါ**:
   - Floor တစ်ခုစီ၏ အပေါ်ဘက်ရှိ **"Scan Floor Camera"** Button ကို နှိပ်လိုက်ပါက Live WebCam Modal ပွင့်လာပါမည်။
3. **Camera Switcher & AI Scanning**:
   - ကင်မရာ အမျိုးအစား (USB Camera, Laptop WebCam, Mobile Camera) ကို ရွေးချယ်ပါ။
   - AI Model မှ ကားများကို Detect လုပ်ပြီး 3D View Architecture အတိုင်း အနီရောင် (Occupied) / အစိမ်းရောင် (Available) အဖြစ် Real-time ပြသပေးမည် ဖြစ်ပါသည်။
4. **Fullscreen ခလုတ်ကို အသုံးပြုပါ**:
   - မျက်နှာပြင် အပြည့်ကြည့်ရန် **`[ Fullscreen ]`** ခလုတ်ကို နှိပ်ပါ။
5. **Database သို့ Sync လုပ်ပါ**:
   - အပြောင်းအလဲများကို DB သို့ ထည့်သွင်းရန် **"Apply to Database"** ကို နှိပ်ပါ သို့မဟုတ် **Auto-Sync** ကို On ထားပါ။

---

📄 စာရွက်စာတမ်း ပြုစုပြီးစီးသည့် ရက်စွဲ: **October 2026**  
🏢 စနစ်အမည်: **Smart Parking Lot System (AI Camera Detection Module)**
