(function () {
    "use strict";

    var canvas = document.getElementById("bgCanvas");
    var ctx = canvas.getContext("2d");
    var moneySymbols = ["$", "\u20B9", "\u00A3", "\u20AC", "\u00A5", "\uD83D\uDCB5", "\uD83D\uDCB0", "\uD83E\uDE99"];
    var floatingItems = [];

    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    function createFloatingItem() {
        return {
            x: Math.random() * canvas.width,
            y: canvas.height + 40,
            size: 14 + Math.random() * 28,
            speed: 0.3 + Math.random() * 0.8,
            symbol: moneySymbols[Math.floor(Math.random() * moneySymbols.length)],
            opacity: 0.06 + Math.random() * 0.12,
            rotateSpeed: (Math.random() - 0.5) * 0.02,
            rotation: Math.random() * Math.PI * 2,
            wobble: Math.random() * Math.PI * 2,
            wobbleSpeed: 0.005 + Math.random() * 0.01,
            wobbleAmount: 20 + Math.random() * 40,
            depth: 0.5 + Math.random() * 0.5,            // for parallax
        };
    }

    // Seed initial items spread across the canvas
    for (var i = 0; i < 25; i++) {
        var item = createFloatingItem();
        item.y = Math.random() * canvas.height;
        floatingItems.push(item);
    }

    function animateCanvas() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        for (var j = floatingItems.length - 1; j >= 0; j--) {
            var it = floatingItems[j];
            it.y -= it.speed * it.depth;
            it.rotation += it.rotateSpeed;
            it.wobble += it.wobbleSpeed;
            var xOffset = Math.sin(it.wobble) * it.wobbleAmount;

            ctx.save();
            ctx.translate(it.x + xOffset, it.y);
            ctx.rotate(it.rotation);
            ctx.globalAlpha = it.opacity * it.depth;
            ctx.font = (it.size * it.depth) + "px Inter, sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(it.symbol, 0, 0);
            ctx.restore();

            if (it.y < -60) {
                floatingItems.splice(j, 1);
            }
        }

        
        if (floatingItems.length < 25 && Math.random() < 0.03) {
            floatingItems.push(createFloatingItem());
        }

        requestAnimationFrame(animateCanvas);
    }
    animateCanvas();

    var particleContainer = document.getElementById("particlesContainer");

    function spawnParticles() {
        for (var p = 0; p < 12; p++) {
            var particle = document.createElement("div");
            particle.classList.add("particle");
            var size = 2 + Math.random() * 4;
            var hue = Math.random() < 0.5 ? "190" : (Math.random() < 0.5 ? "260" : "145");
            particle.style.width = size + "px";
            particle.style.height = size + "px";
            particle.style.left = Math.random() * 100 + "%";
            particle.style.background = "hsla(" + hue + ",80%,65%,0.4)";
            particle.style.boxShadow = "0 0 " + (size * 2) + "px hsla(" + hue + ",80%,65%,0.3)";
            var dur = 12 + Math.random() * 18;
            particle.style.animationDuration = dur + "s";
            particle.style.animationDelay = (Math.random() * dur) + "s";
            particleContainer.appendChild(particle);

            // Cleanup
            (function(el, d) {
                setTimeout(function() {
                    if (el.parentNode) el.parentNode.removeChild(el);
                }, (d * 2) * 1000);
            })(particle, dur);
        }
    }
    spawnParticles();
    setInterval(spawnParticles, 15000);

    var toastContainer = document.getElementById("toastContainer");

    function showToast(message, type) {
        type = type || "success";
        var toast = document.createElement("div");
        toast.className = "toast toast-" + type;

        var icons = { success: "\u2705", warning: "\u26A0\uFE0F", error: "\u274C" };
        toast.textContent = (icons[type] || "") + "  " + message;
        toastContainer.appendChild(toast);

        setTimeout(function () {
            toast.classList.add("toast-out");
            setTimeout(function () {
                if (toast.parentNode) toast.parentNode.removeChild(toast);
            }, 300);
        }, 3500);
    }

    function launchConfetti() {
        var colors = ["#00e676", "#00d4ff", "#7b68ee", "#ffab00", "#ff5252", "#fff"];
        for (var c = 0; c < 50; c++) {
            var piece = document.createElement("div");
            piece.classList.add("confetti-piece");
            piece.style.left = (10 + Math.random() * 80) + "%";
            piece.style.top = "-10px";
            piece.style.background = colors[Math.floor(Math.random() * colors.length)];
            piece.style.width = (6 + Math.random() * 8) + "px";
            piece.style.height = (6 + Math.random() * 8) + "px";
            piece.style.borderRadius = Math.random() > 0.5 ? "50%" : "2px";
            var dur = 1.5 + Math.random() * 2;
            piece.style.animationDuration = dur + "s";
            piece.style.animationDelay = (Math.random() * 0.5) + "s";
            document.body.appendChild(piece);

            (function(el, d) {
                setTimeout(function() {
                    if (el.parentNode) el.parentNode.removeChild(el);
                }, (d + 1) * 1000);
            })(piece, dur);
        }
    }

    var scanForm        = document.getElementById("scanForm");
    var isAuthPage      = !scanForm;

    if (isAuthPage) {
        var loginTab      = document.getElementById("loginTab");
        var signupTab     = document.getElementById("signupTab");
        var tabIndicator  = document.getElementById("tabIndicator");
        var loginForm     = document.getElementById("loginForm");
        var signupForm    = document.getElementById("signupForm");
        var authMessage   = document.getElementById("authMessage");
        var authFooter    = document.getElementById("authFooter");
        var switchLink    = document.getElementById("switchToSignup");

        function switchTab(tab) {
            if (tab === "signup") {
                loginTab.classList.remove("active");
                signupTab.classList.add("active");
                tabIndicator.classList.add("right");
                loginForm.style.display = "none";
                signupForm.style.display = "";
                authFooter.innerHTML = '<span>Already have an account?</span> <a href="#" id="switchToLogin">Login here</a>';
                document.getElementById("switchToLogin").addEventListener("click", function(e) { e.preventDefault(); switchTab("login"); });
            } else {
                signupTab.classList.remove("active");
                loginTab.classList.add("active");
                tabIndicator.classList.remove("right");
                signupForm.style.display = "none";
                loginForm.style.display = "";
                authFooter.innerHTML = '<span>Don\'t have an account?</span> <a href="#" id="switchToSignup">Sign up here</a>';
                document.getElementById("switchToSignup").addEventListener("click", function(e) { e.preventDefault(); switchTab("signup"); });
            }
            hideMessage();
        }

        loginTab.addEventListener("click", function() { switchTab("login"); });
        signupTab.addEventListener("click", function() { switchTab("signup"); });
        if (switchLink) {
            switchLink.addEventListener("click", function(e) { e.preventDefault(); switchTab("signup"); });
        }

        function showMessage(text, type) {
            authMessage.textContent = text;
            authMessage.className = "auth-message " + type;
            authMessage.style.display = "";
        }

        function hideMessage() {
            authMessage.style.display = "none";
        }

        function setAuthLoading(btn, loading) {
            var btnText = btn.querySelector(".btn-text");
            var btnLoading = btn.querySelector(".btn-loading");
            btn.disabled = loading;
            btnText.style.display = loading ? "none" : "";
            btnLoading.style.display = loading ? "inline-flex" : "none";
        }

        // Login form
        loginForm.addEventListener("submit", async function(e) {
            e.preventDefault();
            hideMessage();
            var username = document.getElementById("loginUsername").value.trim();
            var password = document.getElementById("loginPassword").value;
            var loginBtn = document.getElementById("loginBtn");

            if (!username || !password) {
                showMessage("Please fill in all fields.", "error");
                return;
            }

            setAuthLoading(loginBtn, true);
            try {
                var res = await fetch("/api/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username: username, password: password })
                });
                var data = await res.json();
                if (!res.ok) {
                    showMessage(data.error || "Login failed.", "error");
                } else {
                    showMessage("Welcome back, " + data.username + "!", "success");
                    setTimeout(function() { window.location.href = "/"; }, 600);
                }
            } catch (err) {
                showMessage("Network error. Please try again.", "error");
            } finally {
                setAuthLoading(loginBtn, false);
            }
        });

        // Signup form
        signupForm.addEventListener("submit", async function(e) {
            e.preventDefault();
            hideMessage();
            var username = document.getElementById("signupUsername").value.trim();
            var password = document.getElementById("signupPassword").value;
            var confirm  = document.getElementById("signupConfirm").value;
            var signupBtn = document.getElementById("signupBtn");

            if (!username || !password || !confirm) {
                showMessage("Please fill in all fields.", "error");
                return;
            }
            if (password !== confirm) {
                showMessage("Passwords do not match.", "error");
                return;
            }

            setAuthLoading(signupBtn, true);
            try {
                var res = await fetch("/api/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username: username, password: password })
                });
                var data = await res.json();
                if (!res.ok) {
                    showMessage(data.error || "Registration failed.", "error");
                } else {
                    showMessage("Account created! Redirecting…", "success");
                    setTimeout(function() { window.location.href = "/"; }, 600);
                }
            } catch (err) {
                showMessage("Network error. Please try again.", "error");
            } finally {
                setAuthLoading(signupBtn, false);
            }
        });
 
        return;
    }

    var imageInput      = document.getElementById("imageInput");
    var uploadZone      = document.getElementById("uploadZone");
    var uploadPlaceholder = document.getElementById("uploadPlaceholder");
    var uploadPreview   = document.getElementById("uploadPreview");
    var previewImg      = document.getElementById("previewImg");
    var clearImgBtn     = document.getElementById("clearImgBtn");
    var serialInput     = document.getElementById("serialInput");
    var locationSelect  = document.getElementById("locationSelect");
    var processBtn      = document.getElementById("processBtn");
    var resultsPanel    = document.getElementById("resultsPanel");
    var historyPanel    = document.getElementById("historyPanel");
    var historyBtn      = document.getElementById("historyBtn");
    var resetBtn        = document.getElementById("resetBtn");

    async function loadLocations() {
        try {
            var res = await fetch("/api/locations");
            var data = await res.json();
            data.locations.forEach(function (loc, idx) {
                var opt = document.createElement("option");
                opt.value = idx;
                opt.textContent = loc.name + " (" + loc.lat + ", " + loc.lon + ")";
                locationSelect.appendChild(opt);
            });
        } catch (err) {
            console.error("Failed to load locations:", err);
        }
    }
    loadLocations();

    uploadZone.addEventListener("click", function () {
        imageInput.click();
    });

    ["dragenter", "dragover", "dragleave", "drop"].forEach(function (evt) {
        uploadZone.addEventListener(evt, function (e) {
            e.preventDefault();
            e.stopPropagation();
        });
    });

    uploadZone.addEventListener("dragenter", function () { uploadZone.classList.add("dragover"); });
    uploadZone.addEventListener("dragover",  function () { uploadZone.classList.add("dragover"); });
    uploadZone.addEventListener("dragleave", function () { uploadZone.classList.remove("dragover"); });
    uploadZone.addEventListener("drop", function (e) {
        uploadZone.classList.remove("dragover");
        if (e.dataTransfer.files.length) {
            imageInput.files = e.dataTransfer.files;
            showImagePreview(e.dataTransfer.files[0]);
        }
    });

    imageInput.addEventListener("change", function () {
        if (imageInput.files.length) {
            showImagePreview(imageInput.files[0]);
        }
    });

    function showImagePreview(file) {
        var reader = new FileReader();
        reader.onload = function (e) {
            previewImg.src = e.target.result;
            uploadPlaceholder.style.display = "none";
            uploadPreview.style.display = "block";
        };
        reader.readAsDataURL(file);
    }

    clearImgBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        imageInput.value = "";
        uploadPlaceholder.style.display = "";
        uploadPreview.style.display = "none";
        previewImg.src = "";
    });

   
    scanForm.addEventListener("submit", async function (e) {
        e.preventDefault();

        var hasImage = imageInput.files.length > 0;
        var hasSerial = serialInput.value.trim().length > 0;

        if (!hasImage && !hasSerial) {
            showToast("Please upload a note image or enter a serial number.", "warning");
            return;
        }

        setLoading(true);

        var formData = new FormData();
        if (hasImage) formData.append("image", imageInput.files[0]);
        if (hasSerial) formData.append("serial", serialInput.value.trim());
        formData.append("location_index", locationSelect.value);

        try {
            var res = await fetch("/api/process", {
                method: "POST",
                body: formData
            });
            var data = await res.json();

            if (!res.ok) {
                showToast(data.error || "Processing failed.", "error");
                setLoading(false);
                return;
            }

            renderResults(data);

            if (data.status_code === "green") {
                showToast("Note verified! Serial " + data.serial + " is authentic.", "success");
                launchConfetti();
            } else if (data.status_code === "yellow") {
                showToast("Clone alert! Serial " + data.serial + " flagged.", "warning");
            } else {
                showToast("Serial " + data.serial + " is not in the verified database.", "error");
            }
        } catch (err) {
            showToast("Network error. Please try again.", "error");
            console.error(err);
        } finally {
            setLoading(false);
        }
    });

    function setLoading(loading) {
        var btnText = processBtn.querySelector(".btn-text");
        var btnLoading = processBtn.querySelector(".btn-loading");
        processBtn.disabled = loading;
        btnText.style.display = loading ? "none" : "";
        btnLoading.style.display = loading ? "inline-flex" : "none";
    }

    function renderResults(data) {
        resultsPanel.style.display = "none";
        void resultsPanel.offsetHeight; 
        resultsPanel.style.display = "block";

        setTimeout(function () {
            resultsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);

        
        var banner = document.getElementById("statusBanner");
        var icon = document.getElementById("statusIcon");
        var title = document.getElementById("statusTitle");
        var message = document.getElementById("statusMessage");

        banner.className = "status-banner " + data.status_code;

        if (data.status_code === "green") {
            icon.textContent = "\uD83D\uDFE2";
            title.textContent = "\u2705 Verified";
        } else if (data.status_code === "yellow") {
            icon.textContent = "\uD83D\uDFE1";
            title.textContent = "\u26A0\uFE0F Trace Alert \u2014 Potential Clone";
        } else {
            icon.textContent = "\uD83D\uDD34";
            title.textContent = "\u274C Invalid / Unverified";
        }
        message.textContent = data.message;

        // Details
        document.getElementById("resultSerial").textContent = data.serial;
        document.getElementById("resultTime").textContent = formatTimestamp(data.timestamp);
        document.getElementById("resultLocation").textContent =
            (data.location.name || (data.location.lat + ", " + data.location.lon));
        document.getElementById("resultScanCount").textContent = data.history.length;

        // Trace map & timeline
        renderMap(data.history);
        document.getElementById("historySerial").textContent = data.serial;
        renderTimeline(data.history);
    }

    function formatTimestamp(iso) {
        var d = new Date(iso);
        return d.toLocaleString(undefined, {
            year: "numeric", month: "short", day: "numeric",
            hour: "2-digit", minute: "2-digit", second: "2-digit"
        });
    }

    function renderMap(history) {
        var mapPins = document.getElementById("mapPins");
        mapPins.innerHTML = "";

        history.forEach(function (scan, idx) {
            var pin = document.createElement("div");
            pin.className = "map-pin";
            pin.style.animationDelay = (idx * 0.15) + "s";

            var isLatest = idx === history.length - 1;
            pin.innerHTML =
                '<span class="map-pin-icon">' + (isLatest ? "\uD83D\uDCCD" : "\uD83D\uDCCC") + '</span>' +
                '<span class="map-pin-label">' + escapeHtml(scan.location.name || "Unknown") + '</span>' +
                '<span class="map-pin-time">' + formatTimestamp(scan.timestamp) + '</span>';

            mapPins.appendChild(pin);
        });
    }

    function renderTimeline(history) {
        var timeline = document.getElementById("historyTimeline");
        timeline.innerHTML = "";

        var reversed = history.slice().reverse();
        reversed.forEach(function (scan, idx) {
            var item = document.createElement("div");
            item.className = "timeline-item";
            item.style.animationDelay = (idx * 0.1) + "s";
            item.innerHTML =
                '<div class="timeline-time">' + formatTimestamp(scan.timestamp) + '</div>' +
                '<div class="timeline-location">\uD83D\uDCCD ' + escapeHtml(scan.location.name || (scan.location.lat + ", " + scan.location.lon)) + '</div>' +
                '<div class="timeline-user">User: ' + escapeHtml(scan.user) + '</div>';
            timeline.appendChild(item);
        });
    }

    historyBtn.addEventListener("click", function () {
        var visible = historyPanel.style.display !== "none";
        if (visible) {
            historyPanel.style.display = "none";
            return;
        }
        loadHistory();
    });

    async function loadHistory() {
        try {
            var res = await fetch("/api/history");
            var data = await res.json();

            document.getElementById("totalScans").textContent = data.total_scans;

            var tbody = document.getElementById("historyBody");
            var emptyState = document.getElementById("emptyHistory");
            var table = document.getElementById("historyTable");

            tbody.innerHTML = "";

            if (!data.history.length) {
                table.style.display = "none";
                emptyState.style.display = "";
            } else {
                table.style.display = "";
                emptyState.style.display = "none";

                data.history.forEach(function (entry) {
                    var tr = document.createElement("tr");
                    tr.innerHTML =
                        '<td class="mono">' + escapeHtml(entry.serial) + '</td>' +
                        '<td>' + formatTimestamp(entry.timestamp) + '</td>' +
                        '<td>' + escapeHtml(entry.location.name || (entry.location.lat + ", " + entry.location.lon)) + '</td>' +
                        '<td><span class="status-badge ' + (entry.verified ? "verified" : "unverified") + '">' +
                            (entry.verified ? "Verified" : "Unverified") +
                        '</span></td>';
                    tbody.appendChild(tr);
                });
            }

            historyPanel.style.display = "none";
            void historyPanel.offsetHeight;
            historyPanel.style.display = "block";
            historyPanel.scrollIntoView({ behavior: "smooth", block: "start" });

            showToast("Loaded " + data.total_scans + " scan records.", "success");
        } catch (err) {
            showToast("Failed to load history.", "error");
            console.error(err);
        }
    }

    resetBtn.addEventListener("click", async function () {
        if (!confirm("Reset all scan data? This cannot be undone.")) return;

        try {
            var res = await fetch("/api/reset", { method: "POST" });
            var data = await res.json();
            showToast(data.message, "success");
            resultsPanel.style.display = "none";
            historyPanel.style.display = "none";
        } catch (err) {
            showToast("Reset failed.", "error");
            console.error(err);
        }
    });

    
    function escapeHtml(text) {
        var div = document.createElement("div");
        div.appendChild(document.createTextNode(text));
        return div.innerHTML;
    }

})();

