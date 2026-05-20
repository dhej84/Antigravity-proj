# UXLearn — UI/UX & Web Dev Learning Platform

> A self-paced learning platform for college students and side hustle professionals to master UI/UX design and modern web development.

🌐 **Live Site:** [https://dhej84.github.io/Antigravity-proj](https://dhej84.github.io/Antigravity-proj)

---

## About the Project

UXLearn is a course dashboard website built as part of an exploration into AI-assisted development. The project was designed and generated using **Google Antigravity** (an agentic AI IDE) and deployed via **GitHub Pages**.

The platform targets:
- College students looking to build UI/UX skills for hackathons and final year projects
- Side hustle professionals wanting to learn product design
- Beginners who want to get into web development using the latest AI tools

---

## Features

- 4 structured learning tracks (Product Design, Hackathon, Creative Skills, Web Dev + AI)
- 12+ courses with beginner to advanced levels
- AI tools section covering Figma, Cursor, Claude, v0.dev, GitHub Copilot and more
- 8-week structured learning path
- Student-friendly pricing with free and pro tiers
- Fully responsive design
- FAQ and Testimonials sections

---

## Tech Stack

| Tool | Purpose |
|------|---------|
| HTML / CSS / JavaScript | Frontend |
| Google Antigravity | AI-assisted code generation |
| Gemini AI | AI image generation for course thumbnails |
| GitHub | Version control |
| GitHub Pages | Free hosting & deployment |

---

## How It Was Built

1. Designed the concept and content structure
2. Used **Google Antigravity** (agentic AI IDE) to generate the full frontend
3. Antigravity used **Gemini** to auto-generate course thumbnail images
4. Pushed code to GitHub using **VS Code Source Control**
5. Deployed live using **GitHub Pages**

---

## Honest Build Journey — Bumps & All

This was my first time working with Antigravity and deploying a project end to end. It did not go perfectly — and that's kind of the point.

**Antigravity hit its free quota mid-build.**
Right when the site was generating, the model ran out of capacity with a reset time of 166 hours. Had to pivot and use a reference template to continue instead of waiting a week.

**GitHub CLI wasn't installed.**
Tried to run `gh repo clone` and got a command not found error. Switched to the standard `git clone` with HTTPS — which actually works better for beginners anyway.

**Kept closing the terminal mid-process.**
Git commands are stateful — you have to stay in the same terminal session. Learned that the hard way after running `cd` in a fresh terminal and wondering why nothing worked.

**The repo was private by default.**
GitHub Pages only works on public repos for free accounts. Had to go into Settings → General → Danger Zone to make it public before Pages would activate.

**Two branches, one confusion.**
Ended up with both a `main` and a `master` branch due to how the repo was initialized locally vs on GitHub. Took a moment to figure out which branch to point GitHub Pages at.

**The folder was empty after cloning.**
Had to manually move the project files into the cloned repo folder before git could track anything. Simple fix, but not obvious the first time.

Despite all of this — the site is live. Every error was a lesson, and none of them were blockers.

---

## What I Learned

- How to use Google Antigravity for agentic AI-assisted development
- Git fundamentals — cloning, staging, committing, pushing
- How branching works and why `main` vs `master` matters
- Deploying a static site with GitHub Pages
- How to stay calm when things break and debug step by step

---

## Local Setup

```bash
# Clone the repo
git clone https://github.com/dhej84/Antigravity-proj.git

# Open in browser
open index.html
```

No frameworks or dependencies — pure HTML/CSS/JS, opens directly in any browser.

---

## Author

**Dhejaswini** — First Year Student  
Exploring AI-assisted development, modern UI/UX tools, and how far you can get with curiosity and a terminal.

---

*Built with Google Antigravity · Deployed on GitHub Pages · Mistakes included at no extra charge*
