@echo off
title KaiStu - Personal Study Workstation
cd /d "e:\KaiStu"
echo Starting KaiStu Study Workstation...
echo Open your browser at: http://localhost:5173
start http://localhost:5173
npm.cmd run dev
pause
