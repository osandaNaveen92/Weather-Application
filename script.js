let globe;
let renderer, scene, camera;
let autoRotate = true;

const apiKey = '5a92633de029895b0ff53d741fc90be2'; // 🔁 Replace with your OpenWeatherMap API key

//3D Globe
function initGlobe() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById('globeViz').appendChild(renderer.domElement);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
  camera.position.z = 300;

  globe = new ThreeGlobe()
    .globeImageUrl('//unpkg.com/three-globe/example/img/earth-night.jpg')
    .labelsData([])
    .labelLat('lat')
    .labelLng('lng')
    .labelText('label')
    .labelSize(2)
    .labelColor(() => 'orange');

  scene.add(globe);

  const light = new THREE.AmbientLight(0xffffff);
  scene.add(light);

  function animate() {
    requestAnimationFrame(animate);
    if (autoRotate) {
      globe.rotation.y += 0.001; // Only rotate if autoRotate is true
    }
    renderer.render(scene, camera);
  }

  animate();
}

//rotate globe to coordinates
function rotateGlobeTo(lat, lon) {
  const targetX = lat * (Math.PI / 180);
  const targetY = -lon * (Math.PI / 180);
  const duration = 1000;
  const startX = globe.rotation.x;
  const startY = globe.rotation.y;
  const startTime = performance.now();

  function animate(time) {
    const t = Math.min(1, (time - startTime) / duration);
    globe.rotation.x = startX + (targetX - startX) * t;
    globe.rotation.y = startY + (targetY - startY) * t;
    if (t < 1) requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

initGlobe();

//weather data + update globe
async function getWeather() {
  const city = document.getElementById("cityInput").value;
  const country = document.getElementById("countryInput")?.value || ""; //country input
  const temperature = document.getElementById("temperature");
  const description = document.getElementById("description");
  const icon = document.getElementById("icon");
  const error = document.getElementById("error");

  if (!city) {
    error.textContent = "Please enter a city.";
    return;
  }

  try {
    //coordinates using Geocoding API
    const geoRes = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}${country ? ',' + country : ''}&limit=1&appid=${apiKey}`
    );
    const geoData = await geoRes.json();
    if (!geoData.length) throw new Error("City not found.");

    const lat = geoData[0].lat;
    const lon = geoData[0].lon;

    //weather using One Call API
    const weatherRes = await fetch(`https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&appid=${apiKey}`);
    const weatherData = await weatherRes.json();
    const current = weatherData.current;

    const daily = weatherData.daily[0];
    const alert = weatherData.alerts?.[0];

    // 📊 Display Weather Data
    temperature.innerHTML = `
      🌡️ <b>Current Temp:</b> ${(current.temp - 273.15).toFixed(1)} °C<br>
      💧 <b>Humidity:</b> ${current.humidity}%<br>
      🌬️ <b>Wind:</b> ${current.wind_speed} m/s<br>
      🧭 <b>Pressure:</b> ${current.pressure} hPa<br>
      ☁️ <b>Clouds:</b> ${current.clouds}%
    `;

    description.innerHTML = `
      🌤️ <b>Condition:</b> ${current.weather[0].description}<br>
      🌅 <b>Sunrise:</b> ${new Date(current.sunrise * 1000).toLocaleTimeString()}<br>
      🌇 <b>Sunset:</b> ${new Date(current.sunset * 1000).toLocaleTimeString()}<br>
      📅 <b>Daily High:</b> ${(daily.temp.max - 273.15).toFixed(1)} °C<br>
      📅 <b>Daily Low:</b> ${(daily.temp.min - 273.15).toFixed(1)} °C
    `;

    icon.src = `https://openweathermap.org/img/wn/${current.weather[0].icon}@2x.png`;
    icon.alt = current.weather[0].description;

    if (alert) {
      error.innerHTML = `
        ⚠️ <b>Alert:</b> ${alert.event}<br>
        🧭 <i>${alert.sender_name}</i><br>
        <pre>${alert.description}</pre>
      `;
    } else {
      error.textContent = "";
    }

    //mark location
    autoRotate = false; // Stop auto-rotation
    globe.labelsData([{ lat, lng: lon, label: city }]);
    rotateGlobeTo(lat, lon);

  } catch (err) {
    error.textContent = err.message;
  }
}
