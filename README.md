![github-submission-banner](https://github.com/user-attachments/assets/a1493b84-e4e2-456e-a791-ce35ee2bcf2f)

# 🚀 WhatsThat -(Vision-to-Audio Assistant)

A Software assistant module that helps visually impaired users understand their surroundings by converting camera input into audio descriptions.
<br>

---

## 📌 Problem Statement -1

**Weave AI magic with Groq**

---

## 🎯 Objective

To build a Realtime Assistive technology that guides blind people in their day to day travel.

---

## 🧠 Team & Approach

### Team Name:  
`Quantumania`

### Team Members:  
- [Vigneshwar](https://github.com/Vigneshwar4053)
- [Bhuvan](https://github.com/bhuvan308)  
- [Keerthi](https://github.com/keerthiboga) 
- [Pramod](https://github.com/Pramod-325)

### Your Approach:  
- This application captures video from the user's device camera, sends frames to a backend server for object detection using YOLOv8s ML model (default), enhances the descriptions using a LLM (llama3-70b-8192), and sends back response descriptions which will be converted to audio for the user.

It can be integrated into various Web apps (or) IoT so that it guides the user with what's in front of them whether that's a threat or general obstacles like so. (currently we present the web-app for demonstration purpose with 'basic utility')

![Architectural Diagram](https://github.com/Pramod-325/whatsthat/blob/main/WhatsThat_Architecture.png)

---

## 🛠️ Tech Stack

### Core Technologies Used:
- Frontend: React (for visual demo at present) but front end is not mandatory
- Backend: FastAPI
- Object detection ML-model: YOLOv8s
- APIs: Groq's for LLM integration
- Hosting: netlify (for frontend)

### Sponsor Technologies Used (if any):
- ✅ **Groq:** _We used Groq for tailoring the responses for the user as fast as possible for the set of detected objects in the video scene_
---

## ✨ Key Features
- ✅ Modular Architecture
- ✅ Visual recognition scene by multiple objects with respect to their timings in the Video Frame
- ✅ User friendly
- ✅ Responsive

Output Screenshots: <br>
---
<p style="display: flex">
<img src="https://github.com/Pramod-325/whatsthat/blob/main/demo_files%2Feqnycujrnpauuwlcogie.webp" style="margin:2em" alt="image-1" width="300">
<img src="https://github.com/Pramod-325/whatsthat/blob/main/demo_files%2Fdi8h70orx0dzsogu8hf3.webp" style="margin:2em" alt="image-2" width="300">
<img src="https://github.com/Pramod-325/whatsthat/blob/main/demo_files%2Fjgmoevhijyt0gc4tcxyc.webp" style="margin:2em" alt="image-3" width="300">
<img src="https://github.com/Pramod-325/whatsthat/blob/main/demo_files%2Fixkb8a9svcdw56k2bnlc.webp" style="margin:2em" alt="image-4" width="300">
<img src="https://github.com/Pramod-325/whatsthat/blob/main/demo_files%2Fuq8bfeucgfcts3rvha0o.webp" style="margin:2em" alt="image-5" width="300">
<img src="https://github.com/Pramod-325/whatsthat/blob/main/demo_files%2Fxgrakx9twuqrjt7zbfhr.webp" style="margin:2em" alt="image-6" width="300">
</p>
---

## 📽️ Demo & Deliverables

- **Demo Video Link:** [Paste YouTube or Loom link here]  
- **Pitch Deck / PPT Link:** [Paste Google Slides / PDF link here]  

---

## FAQs ❔

<details>
  <summary><b>Q: How will a blind person use this this ?</b></summary>
  <p>Currently for demonstration we've added the frontend web interface, but we can separately integrate the functionality to custom hardware projects so make the application auto run or turn on using voice commands for Real-life usage</p>
</details>

<details>
  <summary><b>Q: How is Groq's API used in the application ?</b></summary>
  <p>We've used open source LLM (Llama) through Groq's API's to tailor custom responses quickly that help the user navigate with respect to the objects in the field of view</p>
</details>

<details>
  <summary><b>Q: Does it provide responses only in English ?</b></summary>
  <p>As per the available opensource models, English responses are given correctly and we'd try to improve and integrate more languages from other FOSS foundations to bring diversity and inclusivity</p>
</details>

<details>
  <summary><b>Q: What model is used for Object detection and what is the data source ?</b></summary>
  <p>We've used Ultralytics' opensource YOLOv8s model with default COCO dataset who provide some of the industry's best ML models in computer vision</p>
</details>

<details>
  <summary><b>Q: I have other Question where can I ask it ?</b></summary>
  <p>We are open to resolve your queries and eager to collaborate. You can open an issue here or mail us at: ![link](mailto:welfare.devs@gmail.com)</p>
</details>

---
## ✅ Tasks & Bonus Checklist

- ✅ **All members of the team completed the mandatory task - Followed at least 2 of our social channels and filled the form** (Details in Participant Manual)  
- ✅ **All members of the team completed Bonus Task 1 - Sharing of Badges and filled the form (2 points)**  (Details in Participant Manual)
- ✅ **All members of the team completed Bonus Task 2 - Signing up for Sprint.dev and filled the form (3 points)**  (Details in Participant Manual)

---

## 🧪 How to Run the Project

### Requirements:
- Python 3.11+
- uv [latest Rust based project management tool for python "install for your platform from here"](https://docs.astral.sh/uv/getting-started/installation/) (optional)
- Node.js 20+
- Get your Groq API key (https://console.groq.com/) .env file in backend
- Download a suitable Yolo model or use it from the Repo we provided (we've used 'YOLOv8s') (https://github.com/ultralytics/ultralytics)

### Local Setup:
**open two separate terminals into same "whatsthat" folder:,<br>(Make sure uv is installed by checking :)**
```bash
uv --version   #to check if uv is installed properly
   ```

1. Clone the repository:
   ```bash
   git clone https://github.com/Pramod-325/whatsthat.git
   cd whatsthat
   ```
### Backend Setup (in Terminal 1)
2. Open backend folder
   ```bash
   cd backend        # run this in 1st Terminal
   ```

3. Install dependencies:
   ```bash
    uv add -r requirements.txt          #in backend terminal (if uv is installed)
                    (or)
    pip install -r requirements.txt     #if uv is not installed
   ```

4. Create a `.env` file with your Groq API key: "in backend Terminal"
   ```
   GROQ_API_KEY=your_groq_api_key_here
   ```
   And Place the downloaded yolo models in "yolo_models directory" or use the given one

5. Start the backend server:
   ```bash
    uv run main.py           #if uv is installed
            (or)
    python main.py
   ```

### Frontend Setup (in Terminal-2)

1. Navigate to the frontend directory from 'whatsthat' folder:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```
   Then Navigate to path in URL or click below link:

4. Open your browser to http://localhost:5173/ (Make sure WebCam is present)

## Using the Application

1. Grant camera access when prompted
2. Click "Start Vision Assistant" to begin processing
3. The application will detect objects and provide audio descriptions
4. Click "Stop Vision Assistant" to end the session


Provide any backend/frontend split or environment setup notes here.

---

## 🧬 Future Scope

- 📈 Improved YOLO models with custom data training
- 🛡️ Security enhancements like integrating everything locally
- 🌐 Adding more LLM integration for native languages for worldwide users

---

## 📎 Resources / Credits

- GROQ's LPU's APIs for fast LLM response
- Open source libraries or tools: ReactJS, FastAPI, YOLOv8s COCO dataset for object detection
- Youtube Video References by:
    - [Keerti Purswani](https://www.youtube.com/@KeertiPurswani/videos)
    - [Arpit Bhayani](https://www.youtube.com/@AsliEngineering/videos)
    - [Piyush Garg](https://www.youtube.com/@piyushgargdev/videos)
    - [Chai aur Code](https://www.youtube.com/@chaiaurcode/videos)

---

## 🏁 Final Words

It's our first online hackathon and a completely a new experience which we enjoyed a lot, there were challenges like working of project in one's computer and not others 😂. We learnt how to properly collab online to complete a project using Github's core functionality and the attempts we made to deploy the application and will forever be a memorable one beacause of the way [Namespace-community](https://www.namespacecomm.in) has planned & executed it, so a huge shoutout also goes to them 🎊🎉🎉

---
