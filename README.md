**🦖 3D Pet Simulator**

A fully interactive 3D virtual pet simulator built with Three.js, featuring real-time animations, state-based logic (idle, eat, play, sleep, wakeup), and smooth visual transitions — all rendered directly in the browser.
The project provides a fun and dynamic pet interaction system with automatic animation handling, hunger/play/sleep states, and user interaction through intuitive UI controls.

**🎮 Live Preview: 👉** https://pet-simulator-rosy.vercel.app/

**🚀 Features:-**

**🐾 Core Pet System**

🧩 Multiple 3D Pets – Choose from different GLB models like Mosasaur and Mikie.

🦴 Interactive States – Pet can eat, sleep, play, or stay idle depending on player input.

⚡ Energy, Hunger, and Boredom Bars – Dynamic, real-time UI reflecting pet’s current state.

🔄 Automatic State Switching – Pet changes states based on internal logic and user actions.

💬 Smart Alerts – Context-based messages like “Your pet is hungry!” or “It’s time to play!”

🧠 Event-Driven Design – All animations and states controlled through JavaScript event listeners.

🎨 3D & Animation Features

🌍 Three.js + GLTFLoader Integration – Renders optimized 3D GLB/GLTF models directly in WebGL.

🌀 Smooth Transitions – Each pet action seamlessly blends between animations via AnimationMixer.

🔁 Auto Animation Recovery – On load, the pet starts in the idle state automatically.

🧱 Responsive Scaling – Automatically adjusts model scale and camera distance for desktop and mobile.

🔆 Lighting & Shadows – Realistic ambient + directional lighting setup.

🎥 OrbitControls – Allows camera rotation and zoom for better pet viewing experience.

**🧰 Technical Setup:-**

**🖥️ Frontend**

HTML5, CSS3, Vanilla JavaScript (ES6)

Three.js – for 3D rendering and model animation

Responsive UI – CSS media queries ensure proper scaling on all screen sizes.

**⚙️ Development & Build**

Vite – fast modern bundler for local dev & optimized production builds.

Static Assets Management – all 3D assets and animation files served from /public/assets.

Deployed on Vercel – lightweight hosting optimized for static JS apps.
