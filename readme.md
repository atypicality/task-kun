# Task-kun AI 🎓✨  
_**An Agentic Task & Time Management Assistant for College Students**_

## 📌 Overview

___Task-kun AI___ is an intelligent productivity assistant designed to help college students manage assignments, exams, and long-term projects. Unlike traditional to-do lists or calendars, Task-kun AI actively reasons about workload and recommends what to work on next.

Its goal is to reduce procrastination, lower stress, and improve academic performance.


## 🚨 What's The Problem?

College students often juggle multiple deadlines and large projects without structured planning support. Most productivity tools require manual prioritization and effort estimation, leaving students responsible for complex planning decisions.

This frequently leads to:
1.  __Procrastination__  
2.  __Missed deadlines__
3.  __Poor workload distribution__  
4.  __Increased stress__


## 💡 How do we solve this?

___Task-kun AI___ applies agentic AI reasoning to:

- Automatically prioritize tasks  
- Break large assignments into smaller subtasks  
- Send adaptive reminders and nudges  
- Recommend the optimal next action  
- Track and visualize progress  

Rather than acting as a passive planner, ___Task-kun AI___ functions as a proactive academic assistant.

## 🧠 For More Infomation

Review our project details at [https://web.biggermatrix.com/project/](https://web.biggermatrix.com/project/). Note that this product is actively being developed! :)

### HOW TO RUN LOCALLY ❓✍️📄

1. To start react app: cd into frontend and run __npm install__ to install all necessary dependencies
2. Once installed, depending on terminal run the command __npm run dev__ or __npm run dev -- --host__
3. To start the backend, cd back to root and cd into backend and run __python3 -m venv venv__
4. To activate the venv run __venv\Scripts\activate__ if you are on powershell, otherwise use __source venv/bin/activate__ for Windows/Linux/etc..
5. Run __pip install --upgrade pip__ , __fastapi uvicorn torch soundfile numpy__ , and __pip install -U qwen-tts__ for dependencies and run __uvicorn main:app --reload__ to officially set up backend (may need to run __run uvicorn main:app --workers 1__ for more stable model)
6. Press Cntrl-C to turn off backend in terminal

## 📝 TESTING 
Use this to check if backend fastapi running ==> http://127.0.0.1:8000/docs

Website is hosted on ==> http://localhost:5173/ 

