/* VeriCraft Frontend Application (Plain Vanilla JavaScript, No Bundler) */

(function (root) {
  "use strict";

  // ---------------------------------------------------------------------------
  // Pure Utility Functions (also exported for Node unit tests)
  // ---------------------------------------------------------------------------

  function truncateAddress(address) {
    if (!address || typeof address !== "string") return "—";
    if (address.length < 12) return address;
    return address.slice(0, 6) + "..." + address.slice(-4);
  }

  function formatTimestamp(unixSeconds) {
    var num = Number(unixSeconds);
    if (!Number.isFinite(num) || num <= 0) return "—";
    var date = new Date(num * 1000);
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function parseProductIdFromSearch(searchString) {
    if (!searchString || typeof searchString !== "string") return null;
    var clean = searchString.startsWith("?") ? searchString.slice(1) : searchString;
    var params = new URLSearchParams(clean);
    var raw = params.get("id");
    if (!raw) return null;
    var parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed < 1) return null;
    return parsed;
  }

  function buildVerificationUrl(origin, pathname, productId) {
    var baseOrigin = origin || "";
    var basePath = pathname || "/";
    return baseOrigin + basePath + "?id=" + String(productId);
  }

  function isValidEthereumAddress(address) {
    return typeof address === "string" && /^0x[a-fA-F0-9]{40}$/.test(address.trim());
  }

  function resolveProductImage(imageHash, productName) {
    var raw = (imageHash || "").trim();
    if (!raw) return null;

    if (raw === "ipfs://QmSampleHash001") {
      return "./assets/craft_rosewood_elephant.jpg";
    }
    if (raw === "ipfs://QmArtisanCraft002" || raw.toLowerCase().includes("lamp")) {
      return "./assets/craft_brass_lamp.jpg";
    }
    if (raw.toLowerCase().includes("shawl") || raw.toLowerCase().includes("silk")) {
      return "./assets/craft_handloom_shawl.jpg";
    }
    if (raw.toLowerCase().includes("pottery") || raw.toLowerCase().includes("terracotta")) {
      return "./assets/craft_terracotta_pottery.jpg";
    }
    if (raw.startsWith("./") || raw.startsWith("/") || raw.startsWith("assets/")) {
      return raw;
    }
    if (raw.startsWith("https://") || raw.startsWith("http://") || raw.startsWith("data:image/")) {
      return raw;
    }
    if (raw.startsWith("ipfs://")) {
      var nameLower = (productName || "").toLowerCase();
      if (nameLower.includes("elephant") || nameLower.includes("rosewood")) {
        return "./assets/craft_rosewood_elephant.jpg";
      }
      if (nameLower.includes("lamp") || nameLower.includes("brass")) {
        return "./assets/craft_brass_lamp.jpg";
      }
      if (nameLower.includes("shawl") || nameLower.includes("silk") || nameLower.includes("loom")) {
        return "./assets/craft_handloom_shawl.jpg";
      }
      if (nameLower.includes("pottery") || nameLower.includes("terracotta") || nameLower.includes("clay")) {
        return "./assets/craft_terracotta_pottery.jpg";
      }
    }
    return null;
  }

  function parseMaterialSwatches(materialsText) {
    if (!materialsText || typeof materialsText !== "string") return [];
    return materialsText
      .split(/,|&|\+| and /i)
      .map(function (part) {
        return part.trim();
      })
      .filter(Boolean)
      .slice(0, 4);
  }

  var discoveredEip6963Providers = [];

  function getMetaMaskProvider() {
    if (typeof window === "undefined") return null;
    if (discoveredEip6963Providers.length > 0) {
      var eipMm = discoveredEip6963Providers.find(function (entry) {
        return entry && entry.info && /metamask/i.test(entry.info.name || "");
      });
      if (eipMm && eipMm.provider) return eipMm.provider;
    }
    if (!window.ethereum) return null;
    if (Array.isArray(window.ethereum.providers) && window.ethereum.providers.length > 0) {
      var mm = window.ethereum.providers.find(function (p) {
        return p && p.isMetaMask;
      });
      return mm || window.ethereum.providers[0];
    }
    return window.ethereum;
  }

  function isEmbeddedFrame() {
    try {
      return typeof window !== "undefined" && window.self !== window.top;
    } catch (e) {
      return true;
    }
  }

  function getErrorCode(err) {
    if (!err) return null;
    if (typeof err.code !== "undefined") return err.code;
    if (err.info && err.info.error && typeof err.info.error.code !== "undefined") {
      return err.info.error.code;
    }
    if (err.data && err.data.originalError && typeof err.data.originalError.code !== "undefined") {
      return err.data.originalError.code;
    }
    return null;
  }

  var pureHelpers = {
    truncateAddress: truncateAddress,
    formatTimestamp: formatTimestamp,
    parseProductIdFromSearch: parseProductIdFromSearch,
    buildVerificationUrl: buildVerificationUrl,
    isValidEthereumAddress: isValidEthereumAddress,
    resolveProductImage: resolveProductImage,
    parseMaterialSwatches: parseMaterialSwatches,
    getErrorCode: getErrorCode,
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = pureHelpers;
  }

  if (typeof document === "undefined" || typeof window === "undefined") {
    return;
  }

  // ---------------------------------------------------------------------------
  // Interactive Preview Fallback Ledger (used ONLY when 127.0.0.1:8545 is offline)
  // ---------------------------------------------------------------------------

  var DEFAULT_FALLBACK_ACCOUNTS = [
    {
      label: "Admin (Deployer)",
      role: "Admin",
      address: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    },
    {
      label: "Ramesh Kumar (Artisan)",
      role: "Verified Artisan",
      address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    },
    {
      label: "Bengaluru Craft Hub (Handler)",
      role: "Handler",
      address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    },
  ];

  function createPreviewLedger() {
    var storageKey = "vericraft_preview_ledger_v1";
    var nowSec = Math.floor(Date.now() / 1000);
    var seed = {
      admin: DEFAULT_FALLBACK_ACCOUNTS[0].address,
      artisanList: [
        "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
      ],
      artisans: {
        "0x70997970C51812dc3A010C7d01b50e0d17dc79C8": {
          name: "Ramesh Kumar",
          craftSpecialty: "Channapatna Lacquerware",
          location: "Channapatna, Karnataka",
          isVerified: true,
        },
        "0x90F79bf6EB2c4f870365E785982E1f101E93b906": {
          name: "Meera Devi Weavers",
          craftSpecialty: "Ilkal Handloom Silk",
          location: "Bagalkot, Karnataka",
          isVerified: true,
        },
      },
      products: [
        {
          id: 1,
          name: "Handcrafted Rosewood Elephant",
          materials: "Ivory Wood & Natural Vegetable Dyes",
          imageHash: "ipfs://QmSampleHash001",
          artisanAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
          currentOwner: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
          createdAt: nowSec - 7200,
          exists: true,
          history: [
            {
              handler: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
              role: "Verified Artisan",
              location: "Channapatna, Karnataka",
              statusNote: "Created by Artisan",
              timestamp: nowSec - 7200,
            },
            {
              handler: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
              role: "Artisan Cooperative Hub",
              location: "Artisan Cooperative Hub, Bengaluru",
              statusNote: "Quality Verified & Dispatched",
              timestamp: nowSec - 3600,
            },
          ],
        },
        {
          id: 2,
          name: "Handwoven Ilkal Silk Shawl",
          materials: "Mulberry Silk, Natural Indigo & Madder Root",
          imageHash: "./assets/craft_handloom_shawl.jpg",
          artisanAddress: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
          currentOwner: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
          createdAt: nowSec - 5400,
          exists: true,
          history: [
            {
              handler: "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
              role: "Verified Artisan",
              location: "Bagalkot, Karnataka",
              statusNote: "Loom-finished & Tagged by Artisan",
              timestamp: nowSec - 5400,
            },
          ],
        },
        {
          id: 3,
          name: "Burnished Terracotta Vessel",
          materials: "River Clay, Slip Glaze & Wood-Kiln Ash",
          imageHash: "./assets/craft_terracotta_pottery.jpg",
          artisanAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
          currentOwner: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
          createdAt: nowSec - 1800,
          exists: true,
          history: [
            {
              handler: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
              role: "Verified Artisan",
              location: "Channapatna, Karnataka",
              statusNote: "Wheel-thrown & Kiln Fired",
              timestamp: nowSec - 1800,
            },
            {
              handler: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
              role: "Retail Boutique",
              location: "Indiranagar Craft Gallery, Bengaluru",
              statusNote: "Inspected & Placed on Gallery Display",
              timestamp: nowSec - 900,
            },
          ],
        },
      ],
    };

    function loadData() {
      try {
        var raw = localStorage.getItem(storageKey);
        if (raw) return JSON.parse(raw);
      } catch (e) {}
      saveData(seed);
      return seed;
    }

    function saveData(data) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(data));
      } catch (e) {}
    }

    function findArtisan(data, addr) {
      var keys = Object.keys(data.artisans);
      for (var i = 0; i < keys.length; i++) {
        if (keys[i].toLowerCase() === addr.toLowerCase()) {
          return data.artisans[keys[i]];
        }
      }
      return { name: "", craftSpecialty: "", location: "", isVerified: false };
    }

    function fakeTx(hashSeed) {
      var hex = "0x" + (hashSeed + Date.now().toString(16)).padEnd(64, "a").slice(0, 64);
      return {
        hash: hex,
        wait: async function () {
          return { hash: hex, logs: [] };
        },
      };
    }

    return {
      isPreviewMode: true,
      admin: async function () {
        return loadData().admin;
      },
      artisans: async function (addr) {
        return findArtisan(loadData(), addr);
      },
      getRegisteredArtisans: async function () {
        return loadData().artisanList;
      },
      getAllProductIds: async function () {
        return loadData().products.length;
      },
      getProductDetails: async function (pid) {
        var data = loadData();
        var item = data.products[Number(pid) - 1];
        if (!item) {
          return { exists: false };
        }
        var maker = findArtisan(data, item.artisanAddress);
        return {
          id: item.id,
          name: item.name,
          materials: item.materials,
          imageHash: item.imageHash,
          artisanAddress: item.artisanAddress,
          currentOwner: item.currentOwner,
          createdAt: item.createdAt,
          exists: true,
          artisanName: maker.name,
          craftSpecialty: maker.craftSpecialty,
          originLocation: maker.location,
        };
      },
      getProductHistory: async function (pid) {
        var data = loadData();
        var item = data.products[Number(pid) - 1];
        return item ? item.history : [];
      },
      createProduct: async function (name, materials, imageHash, sender) {
        var data = loadData();
        var maker = findArtisan(data, sender);
        if (!maker.isVerified) {
          throw new Error("Only verified artisans can register products.");
        }
        var newId = data.products.length + 1;
        var ts = Math.floor(Date.now() / 1000);
        data.products.push({
          id: newId,
          name: name,
          materials: materials,
          imageHash: imageHash,
          artisanAddress: sender,
          currentOwner: sender,
          createdAt: ts,
          exists: true,
          history: [
            {
              handler: sender,
              role: "Verified Artisan",
              location: maker.location,
              statusNote: "Created by Artisan",
              timestamp: ts,
            },
          ],
        });
        saveData(data);
        return fakeTx("c0de");
      },
      transferCustody: async function (pid, nextOwner, role, location, note, sender) {
        var data = loadData();
        var item = data.products[Number(pid) - 1];
        if (!item) throw new Error("Product does not exist.");
        if (item.currentOwner.toLowerCase() !== sender.toLowerCase()) {
          throw new Error("Only the current owner can transfer custody.");
        }
        if (nextOwner.toLowerCase() === item.currentOwner.toLowerCase()) {
          throw new Error("Next owner must differ from current owner.");
        }
        var ts = Math.floor(Date.now() / 1000);
        item.currentOwner = nextOwner;
        item.history.push({
          handler: nextOwner,
          role: role,
          location: location,
          statusNote: note,
          timestamp: ts,
        });
        saveData(data);
        return fakeTx("7ran");
      },
      registerArtisan: async function (wallet, name, specialty, location, sender) {
        var data = loadData();
        if (sender.toLowerCase() !== data.admin.toLowerCase()) {
          throw new Error("Only admin can verify artisans.");
        }
        var exists = data.artisanList.some(function (a) {
          return a.toLowerCase() === wallet.toLowerCase();
        });
        if (!exists) data.artisanList.push(wallet);
        data.artisans[wallet] = {
          name: name,
          craftSpecialty: specialty,
          location: location,
          isVerified: true,
        };
        saveData(data);
        return fakeTx("ad1n");
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Application State
  // ---------------------------------------------------------------------------

  var state = {
    mode: "offline", // "live" | "preview" | "offline"
    readProvider: null,
    readContract: null,
    signer: null,
    writeContract: null,
    previewLedger: null,
    connectedAddress: null,
    walletMode: "guest", // "guest" | "metamask" | "hardhat" | "preview"
    adminAddress: null,
    isVerifiedArtisan: false,
    currentProductId: 1,
    activeTab: "verify",
  };

  function getRpcUrl() {
    return typeof DEFAULT_RPC_URL !== "undefined" && DEFAULT_RPC_URL
      ? DEFAULT_RPC_URL
      : "http://127.0.0.1:8545";
  }

  function getDemoAccounts() {
    if (typeof HARDHAT_DEMO_ACCOUNTS !== "undefined" && Array.isArray(HARDHAT_DEMO_ACCOUNTS) && HARDHAT_DEMO_ACCOUNTS.length > 0) {
      return HARDHAT_DEMO_ACCOUNTS;
    }
    return DEFAULT_FALLBACK_ACCOUNTS;
  }

  function hasValidConfig() {
    return (
      typeof CONTRACT_ADDRESS === "string" &&
      isValidEthereumAddress(CONTRACT_ADDRESS) &&
      Array.isArray(CONTRACT_ABI) &&
      CONTRACT_ABI.length > 0
    );
  }

  // ---------------------------------------------------------------------------
  // DOM Helpers
  // ---------------------------------------------------------------------------

  function el(id) {
    return document.getElementById(id);
  }

  function showElement(element) {
    if (element) element.classList.remove("hidden");
  }

  function hideElement(element) {
    if (element) element.classList.add("hidden");
  }

  function setFeedback(boxId, type, message) {
    var box = el(boxId);
    if (!box) return;
    box.className = "feedback-box";
    if (type === "success") box.classList.add("feedback-success");
    else if (type === "error") box.classList.add("feedback-error");
    else box.classList.add("feedback-pending");
    box.textContent = message;
    showElement(box);
  }

  function clearFeedback(boxId) {
    var box = el(boxId);
    if (!box) return;
    box.textContent = "";
    hideElement(box);
  }

  // ---------------------------------------------------------------------------
  // Tab Navigation
  // ---------------------------------------------------------------------------

  function switchTab(tabName) {
    state.activeTab = tabName;
    document.querySelectorAll(".nav-tab").forEach(function (btn) {
      var isTarget = btn.getAttribute("data-tab") === tabName;
      btn.classList.toggle("is-active", isTarget);
      btn.setAttribute("aria-selected", isTarget ? "true" : "false");
    });

    document.querySelectorAll(".view-panel").forEach(function (panel) {
      var isTarget = panel.id === "view-" + tabName;
      panel.classList.toggle("is-active", isTarget);
      panel.classList.toggle("hidden", !isTarget);
      if (isTarget) panel.removeAttribute("hidden");
      else panel.setAttribute("hidden", "");
    });

    if (tabName === "handoff") {
      refreshHandoffPreview();
    } else if (tabName === "admin") {
      loadArtisansDirectory();
    }
  }

  // ---------------------------------------------------------------------------
  // Provider & Contract Initialization (Live Hardhat -> Interactive Preview)
  // ---------------------------------------------------------------------------

  async function initReadProvider() {
    var footerAddr = el("footerContractAddress");
    if (footerAddr) {
      footerAddr.textContent = hasValidConfig() ? CONTRACT_ADDRESS : "Interactive Preview Ledger";
    }

    if (typeof ethers !== "undefined" && hasValidConfig()) {
      try {
        var provider = new ethers.JsonRpcProvider(getRpcUrl());
        await provider.getBlockNumber();

        var code = await provider.getCode(CONTRACT_ADDRESS);
        if (code && code !== "0x") {
          state.mode = "live";
          state.readProvider = provider;
          state.readContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
          state.adminAddress = await state.readContract.admin();

          el("adminAddressHint").textContent = state.adminAddress;
          el("networkStatusText").textContent = "Hardhat Local (31337)";
          hideElement(el("reconnectNodeBtn"));
          return true;
        }
      } catch (err) {
        // Fall through smoothly to Interactive Craft Preview mode
      }
    }

    // Engage Interactive Craft Preview mode so the UI never dead-ends offline
    state.mode = "preview";
    state.previewLedger = createPreviewLedger();
    state.readContract = state.previewLedger;
    state.adminAddress = await state.previewLedger.admin();

    el("adminAddressHint").textContent = state.adminAddress;
    el("networkStatusText").textContent = "Preview Ledger (Start Hardhat for On-Chain)";
    showElement(el("reconnectNodeBtn"));
    return true;
  }

  // ---------------------------------------------------------------------------
  // Wallet Connection Modal & MetaMask Integration
  // ---------------------------------------------------------------------------

  function populateSignerControls() {
    var select = el("demoAccountSelect");
    var handoffHelpers = el("handoffDemoHelpers");
    var modalRoles = el("modalRoleList");
    var accounts = getDemoAccounts();

    if (select) {
      select.innerHTML = "";
      var defaultOpt = document.createElement("option");
      defaultOpt.value = "";
      defaultOpt.textContent = "Read-Only (Guest)";
      select.appendChild(defaultOpt);
    }
    if (handoffHelpers) handoffHelpers.innerHTML = "";
    if (modalRoles) modalRoles.innerHTML = "";

    accounts.forEach(function (acc, index) {
      if (select) {
        var opt = document.createElement("option");
        opt.value = acc.address;
        opt.textContent = acc.label;
        select.appendChild(opt);
      }

      if (handoffHelpers && index > 0) {
        var helperBtn = document.createElement("button");
        helperBtn.type = "button";
        helperBtn.className = "btn-inline";
        helperBtn.textContent = "Use " + acc.label.split(" (")[0];
        helperBtn.addEventListener("click", function () {
          el("nextOwnerAddress").value = acc.address;
        });
        handoffHelpers.appendChild(helperBtn);
      }

      if (modalRoles) {
        var roleBtn = document.createElement("button");
        roleBtn.type = "button";
        roleBtn.className = "modal-role-btn";

        var left = document.createElement("div");
        var title = document.createElement("span");
        title.className = "modal-role-title";
        title.textContent = acc.label;
        var addr = document.createElement("span");
        addr.className = "modal-role-addr";
        addr.textContent = acc.address;
        left.appendChild(title);
        left.appendChild(addr);

        var tag = document.createElement("span");
        tag.className = "role-tag " + (index === 0 ? "role-admin" : index === 1 ? "role-artisan" : "role-handler");
        tag.textContent = acc.role;

        roleBtn.appendChild(left);
        roleBtn.appendChild(tag);
        roleBtn.addEventListener("click", function () {
          closeWalletModal();
          connectLocalRole(acc.address);
        });
        modalRoles.appendChild(roleBtn);
      }
    });
  }

  function updateWalletModalMetaMaskState() {
    var rpcRow = el("metamaskRpcRow");
    var statusMsg = el("metamaskStatusMsg");
    var mmBtn = el("modalMetaMaskBtn");
    var standaloneLink = el("openStandaloneTabLink");
    if (!statusMsg || !mmBtn || !standaloneLink) return;

    var eth = getMetaMaskProvider();
    if (eth) {
      statusMsg.textContent =
        "MetaMask detected. Click to authorize your account on Hardhat Localhost (Chain ID 31337).";
      showElement(mmBtn);
      hideElement(standaloneLink);
      hideElement(rpcRow);
    } else {
      statusMsg.textContent =
        "Demo wallet mode active. Pick any craft role below to test Admin, Artisan, or Handler actions.";
      hideElement(mmBtn);
      hideElement(standaloneLink);
      hideElement(rpcRow);
    }
  }

  async function handleConnectWalletButtonClick() {
    // If already connected, open the role-switcher modal so user can switch roles or disconnect
    if (state.connectedAddress) {
      openWalletModal();
      return;
    }

    // If MetaMask is already unlocked with an authorized account, connect it silently;
    // otherwise immediately connect the default demo Artisan wallet without any popup or onboarding screen.
    var eth = getMetaMaskProvider();
    if (eth) {
      try {
        var existingAccounts = await eth.request({ method: "eth_accounts" });
        if (existingAccounts && existingAccounts.length > 0) {
          await connectMetaMask(false);
          return;
        }
      } catch (e) {
        // Fall through to direct local demo connection
      }
    }

    var accounts = getDemoAccounts();
    if (accounts && accounts.length > 0) {
      var defaultAccount = accounts[1] || accounts[0];
      await connectLocalRole(defaultAccount.address);
    }
  }

  function openWalletModal() {
    updateWalletModalMetaMaskState();
    showElement(el("walletModal"));
  }

  function closeWalletModal() {
    hideElement(el("walletModal"));
  }

  async function connectMetaMask(silentOnly) {
    var eth = getMetaMaskProvider();
    if (!eth) {
      if (!silentOnly) openWalletModal();
      return;
    }

    try {
      var accounts = silentOnly
        ? await eth.request({ method: "eth_accounts" })
        : await eth.request({ method: "eth_requestAccounts" });

      if (!accounts || accounts.length === 0) {
        return;
      }

      // Check current chain ID and request Hardhat Localhost (0x7a69 / 31337) if needed
      if (!silentOnly) {
        var currentChainId = await eth.request({ method: "eth_chainId" });
        if (currentChainId && currentChainId.toLowerCase() !== "0x7a69") {
          try {
            await eth.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: "0x7a69" }],
            });
          } catch (switchErr) {
            var code = getErrorCode(switchErr);
            if (code === 4902) {
              try {
                await eth.request({
                  method: "wallet_addEthereumChain",
                  params: [
                    {
                      chainId: "0x7a69",
                      chainName: "Hardhat Localhost 8545",
                      rpcUrls: ["http://127.0.0.1:8545"],
                      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
                    },
                  ],
                });
              } catch (addErr) {
                // Keep connected even if user cancels network add
              }
            }
          }
        }
      }

      var browserProvider = new ethers.BrowserProvider(eth);
      var signer = await browserProvider.getSigner();
      var address = await signer.getAddress();

      state.signer = signer;
      state.connectedAddress = address;
      state.walletMode = "metamask";

      if (state.mode === "live" && hasValidConfig()) {
        state.writeContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      } else {
        state.writeContract = null;
      }

      var demoSelect = el("demoAccountSelect");
      if (demoSelect) demoSelect.value = "";

      closeWalletModal();
      await refreshWalletRoleUI();
    } catch (err) {
      if (!silentOnly) {
        var statusMsg = el("metamaskStatusMsg");
        if (statusMsg) statusMsg.textContent = extractErrorMessage(err);
        showElement(el("metamaskRpcRow"));
        showElement(el("walletModal"));
      }
    }
  }

  async function connectLocalRole(address) {
    if (!address) {
      disconnectWallet();
      return;
    }

    if (state.mode === "live" && state.readProvider) {
      try {
        var signer = await state.readProvider.getSigner(address);
        state.signer = signer;
        state.connectedAddress = await signer.getAddress();
        state.walletMode = "hardhat";
        state.writeContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      } catch (err) {
        return;
      }
    } else {
      state.signer = null;
      state.connectedAddress = address;
      state.walletMode = "preview";
      state.writeContract = state.previewLedger;
    }

    var select = el("demoAccountSelect");
    if (select && select.value !== state.connectedAddress) {
      select.value = state.connectedAddress;
    }

    await refreshWalletRoleUI();
  }

  function disconnectWallet() {
    state.signer = null;
    state.writeContract = null;
    state.connectedAddress = null;
    state.walletMode = "guest";
    state.isVerifiedArtisan = false;
    var select = el("demoAccountSelect");
    if (select) select.value = "";
    refreshWalletRoleUI();
  }

  async function refreshWalletRoleUI() {
    var addrDisplay = el("walletAddressDisplay");
    var copyBtn = el("copyWalletBtn");
    var disconnectBtn = el("disconnectWalletBtn");
    var roleBadge = el("walletRoleBadge");
    var connectBtn = el("connectWalletBtn");
    var artisanNotice = el("artisanAuthNotice");
    var adminNotice = el("adminAuthNotice");

    if (!state.connectedAddress) {
      addrDisplay.textContent = "Guest (Read-Only)";
      hideElement(copyBtn);
      hideElement(disconnectBtn);
      roleBadge.textContent = "Guest";
      roleBadge.className = "role-tag role-guest";
      connectBtn.textContent = "Connect Wallet";
      showElement(artisanNotice);
      showElement(adminNotice);
      return;
    }

    addrDisplay.textContent = truncateAddress(state.connectedAddress);
    addrDisplay.title = state.connectedAddress;
    showElement(copyBtn);
    showElement(disconnectBtn);
    connectBtn.textContent = truncateAddress(state.connectedAddress);

    var roleText = "Handler";
    var roleClass = "role-handler";
    var isAdmin = false;
    var isArtisan = false;

    if (state.readContract) {
      try {
        if (!state.adminAddress) {
          state.adminAddress = await state.readContract.admin();
        }
        isAdmin =
          state.adminAddress &&
          state.connectedAddress.toLowerCase() === state.adminAddress.toLowerCase();

        var artisanInfo = await state.readContract.artisans(state.connectedAddress);
        isArtisan = Boolean(artisanInfo && artisanInfo.isVerified);
      } catch (e) {}
    }

    state.isVerifiedArtisan = isArtisan;

    if (isAdmin && isArtisan) {
      roleText = "Admin · Artisan";
      roleClass = "role-admin";
    } else if (isAdmin) {
      roleText = "Admin";
      roleClass = "role-admin";
    } else if (isArtisan) {
      roleText = "Verified Artisan";
      roleClass = "role-artisan";
    }

    roleBadge.textContent = roleText;
    roleBadge.className = "role-tag " + roleClass;

    if (isArtisan) hideElement(artisanNotice);
    else showElement(artisanNotice);

    if (isAdmin) hideElement(adminNotice);
    else showElement(adminNotice);
  }

  // ---------------------------------------------------------------------------
  // Tab 1: Customer Verification & Interactive Craft Catalog
  // ---------------------------------------------------------------------------

  async function loadProductListChips() {
    var listContainer = el("quickProductList");
    var countText = el("catalogCountText");
    if (!listContainer || !state.readContract) return;

    try {
      var total = Number(await state.readContract.getAllProductIds());
      if (countText) {
        countText.textContent = total + (total === 1 ? " Piece Registered" : " Pieces Registered");
      }

      listContainer.innerHTML = "";
      if (total === 0) {
        listContainer.innerHTML = '<span class="muted-text">No artisan products registered yet.</span>';
        return;
      }

      var start = Math.max(1, total - 7);
      var ids = [];
      for (var id = start; id <= total; id++) {
        ids.push(id);
      }

      var products = await Promise.all(
        ids.map(function (pid) {
          return state.readContract.getProductDetails(pid);
        })
      );

      products.forEach(function (details) {
        var pid = Number(details.id);
        var card = document.createElement("button");
        card.type = "button";
        card.className = "craft-gallery-card";
        if (pid === state.currentProductId) card.classList.add("is-selected");
        card.setAttribute("data-product-id", String(pid));

        var thumb = document.createElement("img");
        thumb.className = "gallery-thumb";
        thumb.alt = details.name;
        thumb.src =
          resolveProductImage(details.imageHash, details.name) ||
          "./assets/craft_rosewood_elephant.jpg";

        var meta = document.createElement("div");
        meta.className = "gallery-card-meta";

        var idSpan = document.createElement("span");
        idSpan.className = "gallery-card-id tabular-nums";
        idSpan.textContent = "Certificate #" + String(pid).padStart(3, "0");

        var nameSpan = document.createElement("span");
        nameSpan.className = "gallery-card-name";
        nameSpan.textContent = details.name;

        var originSpan = document.createElement("span");
        originSpan.className = "gallery-card-origin";
        originSpan.textContent =
          (details.artisanName || "Artisan") + " · " + (details.originLocation || "Origin");

        meta.appendChild(idSpan);
        meta.appendChild(nameSpan);
        meta.appendChild(originSpan);

        card.appendChild(thumb);
        card.appendChild(meta);
        card.addEventListener("click", function () {
          loadAndRenderProduct(pid);
        });
        listContainer.appendChild(card);
      });
    } catch (err) {
      listContainer.textContent = "Unable to load craft catalog.";
    }
  }

  function updateQuickChipSelection(activeId) {
    document.querySelectorAll(".craft-gallery-card").forEach(function (card) {
      var pid = Number(card.getAttribute("data-product-id"));
      card.classList.toggle("is-selected", pid === activeId);
    });
  }

  async function loadAndRenderProduct(productId) {
    state.currentProductId = productId;
    var searchInput = el("searchProductId");
    if (searchInput) searchInput.value = String(productId);
    updateQuickChipSelection(productId);

    hideElement(el("verifyError"));
    hideElement(el("certificateCard"));
    showElement(el("verifyLoading"));

    if (!state.readContract) {
      await initReadProvider();
    }

    try {
      var details = await state.readContract.getProductDetails(productId);
      if (!details || !details.exists) {
        hideElement(el("verifyLoading"));
        el("verifyErrorTitle").textContent = "Product #" + productId + " Not Found";
        el("verifyErrorMessage").textContent =
          "No craft provenance certificate exists on-chain for Product ID #" + productId + ".";
        showElement(el("verifyError"));
        return;
      }

      var history = await state.readContract.getProductHistory(productId);
      renderCertificate(details, history);
      hideElement(el("verifyLoading"));
      showElement(el("certificateCard"));
    } catch (err) {
      hideElement(el("verifyLoading"));
      el("verifyErrorTitle").textContent = "Verification Lookup Failed";
      el("verifyErrorMessage").textContent =
        err && err.message ? err.message : "Could not read product data.";
      showElement(el("verifyError"));
    }
  }

  function renderCertificate(details, history) {
    var idNum = Number(details.id);
    el("certProductId").textContent = "#" + String(idNum).padStart(3, "0");
    el("certProductName").textContent = details.name;
    el("certCraftSpecialty").textContent = details.craftSpecialty || "Traditional Handcrafted Good";
    el("certArtisanName").textContent = details.artisanName || "Verified Artisan";
    el("certOriginLocation").textContent = details.originLocation || "—";
    el("certMaterials").textContent = details.materials || "—";
    el("certArtisanAddress").textContent = details.artisanAddress;
    el("certCurrentOwner").textContent = details.currentOwner;
    el("certCreatedAt").textContent = formatTimestamp(details.createdAt);
    el("certImageHash").textContent = details.imageHash || "None provided";

    // Material Swatches
    var swatchRow = el("certMaterialSwatches");
    swatchRow.innerHTML = "";
    var swatchColors = ["#8c5e2a", "#1e3d59", "#25644c", "#b84a27"];
    parseMaterialSwatches(details.materials).forEach(function (mat, idx) {
      var tag = document.createElement("span");
      tag.className = "material-swatch";
      var chip = document.createElement("span");
      chip.className = "swatch-chip";
      chip.style.backgroundColor = swatchColors[idx % swatchColors.length];
      var text = document.createElement("span");
      text.textContent = mat;
      tag.appendChild(chip);
      tag.appendChild(text);
      swatchRow.appendChild(tag);
    });

    // Share button
    var shareBtn = el("copyShareLinkBtn");
    shareBtn.onclick = function () {
      var url = buildVerificationUrl(window.location.origin, window.location.pathname, idNum);
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url);
        shareBtn.textContent = "Link Copied";
        setTimeout(function () {
          shareBtn.textContent = "Copy Share Link";
        }, 1600);
      }
    };

    // Image resolution with fallback
    var imgEl = el("certProductImage");
    var fallbackEl = el("certImageFallback");
    var fallbackLabel = el("certFallbackLabel");
    var resolvedSrc = resolveProductImage(details.imageHash, details.name);
    fallbackLabel.textContent = details.name || "Archival Craft Record";

    if (resolvedSrc) {
      imgEl.alt = details.name + " crafted by " + details.artisanName;
      imgEl.onload = function () {
        showElement(imgEl);
        hideElement(fallbackEl);
      };
      imgEl.onerror = function () {
        hideElement(imgEl);
        showElement(fallbackEl);
      };
      imgEl.src = resolvedSrc;
    } else {
      imgEl.removeAttribute("src");
      hideElement(imgEl);
      showElement(fallbackEl);
    }

    // Horizontal Stepper + Vertical Provenance Timeline
    var stepperEl = el("journeyStepper");
    var timelineEl = el("provenanceTimeline");
    stepperEl.innerHTML = "";
    timelineEl.innerHTML = "";

    var checkpoints = Array.isArray(history) ? history : [];
    el("checkpointCountLabel").textContent =
      checkpoints.length + (checkpoints.length === 1 ? " Checkpoint" : " Checkpoints");

    function highlightCheckpoint(activeIndex) {
      stepperEl.querySelectorAll(".journey-node").forEach(function (node, i) {
        node.classList.toggle("is-active-node", i === activeIndex);
      });
      timelineEl.querySelectorAll(".timeline-item").forEach(function (item, i) {
        item.classList.toggle("is-highlighted", i === activeIndex);
      });
    }

    checkpoints.forEach(function (cp, idx) {
      // Horizontal clickable journey node
      var nodeBtn = document.createElement("button");
      nodeBtn.type = "button";
      nodeBtn.className = "journey-node";
      if (idx === checkpoints.length - 1) nodeBtn.classList.add("is-active-node");

      var nodeStep = document.createElement("span");
      nodeStep.className = "journey-node-step tabular-nums";
      nodeStep.textContent = "Step " + String(idx + 1).padStart(2, "0");

      var nodeRole = document.createElement("span");
      nodeRole.className = "journey-node-role";
      nodeRole.textContent = cp.role;

      var nodeLoc = document.createElement("span");
      nodeLoc.className = "journey-node-loc";
      nodeLoc.textContent = cp.location;

      nodeBtn.appendChild(nodeStep);
      nodeBtn.appendChild(nodeRole);
      nodeBtn.appendChild(nodeLoc);
      nodeBtn.addEventListener("click", function () {
        highlightCheckpoint(idx);
      });
      stepperEl.appendChild(nodeBtn);

      // Vertical detailed timeline item
      var li = document.createElement("li");
      li.className = "timeline-item";
      if (idx === checkpoints.length - 1) li.classList.add("is-highlighted");

      var step = document.createElement("div");
      step.className = "timeline-step tabular-nums";
      step.textContent = String(idx + 1).padStart(2, "0");

      var card = document.createElement("div");
      card.className = "timeline-card";

      var top = document.createElement("div");
      top.className = "timeline-top";

      var roleSpan = document.createElement("span");
      roleSpan.className = "timeline-role";
      roleSpan.textContent = cp.role;

      var timeSpan = document.createElement("span");
      timeSpan.className = "timeline-time tabular-nums";
      timeSpan.textContent = formatTimestamp(cp.timestamp);

      top.appendChild(roleSpan);
      top.appendChild(timeSpan);

      var locDiv = document.createElement("div");
      locDiv.className = "timeline-location";
      locDiv.textContent = cp.location;

      var noteP = document.createElement("p");
      noteP.className = "timeline-note";
      noteP.textContent = cp.statusNote;

      var handlerDiv = document.createElement("div");
      handlerDiv.className = "timeline-handler";
      handlerDiv.textContent = "Handler: ";
      var handlerCode = document.createElement("code");
      handlerCode.className = "mono-value";
      handlerCode.textContent = cp.handler;
      handlerDiv.appendChild(handlerCode);

      card.appendChild(top);
      card.appendChild(locDiv);
      card.appendChild(noteP);
      card.appendChild(handlerDiv);

      li.appendChild(step);
      li.appendChild(card);
      timelineEl.appendChild(li);
    });
  }

  // ---------------------------------------------------------------------------
  // Tab 2: Artisan Portal (Create Product & Live Hangtag Studio)
  // ---------------------------------------------------------------------------

  function updateHangtagLivePreview() {
    var name = el("productNameInput").value.trim() || "Handwoven Ilkal Silk Shawl";
    var materials = el("productMaterialsInput").value.trim() || "Natural fibers & botanical dyes";
    var hash = el("productImageHashInput").value.trim();
    var thumb = el("hangtagLiveThumb");

    el("qrProductTitle").textContent = name;
    el("qrMaterialsPreview").textContent = materials;
    var resolved = resolveProductImage(hash, name);
    thumb.src = resolved || "./assets/craft_handloom_shawl.jpg";
  }

  async function handleCreateProduct(event) {
    event.preventDefault();
    clearFeedback("artisanFeedback");

    if (!state.connectedAddress) {
      setFeedback("artisanFeedback", "error", "Connect a Verified Artisan wallet first.");
      openWalletModal();
      return;
    }

    if (state.mode === "live" && !state.writeContract) {
      setFeedback("artisanFeedback", "error", "Connect MetaMask or a Local Hardhat Signer to sign on-chain.");
      return;
    }

    var name = el("productNameInput").value.trim();
    var materials = el("productMaterialsInput").value.trim();
    var imageHash = el("productImageHashInput").value.trim();

    if (!name || !materials) {
      setFeedback("artisanFeedback", "error", "Product name and raw materials are required.");
      return;
    }

    var submitBtn = el("createProductSubmitBtn");
    submitBtn.disabled = true;
    setFeedback("artisanFeedback", "pending", "Minting origin certificate...");

    try {
      var receipt;
      var newProductId = null;

      if (state.mode === "preview") {
        var tx = await state.previewLedger.createProduct(
          name,
          materials,
          imageHash,
          state.connectedAddress
        );
        receipt = await tx.wait();
        newProductId = Number(await state.previewLedger.getAllProductIds());
      } else {
        var liveTx = await state.writeContract.createProduct(name, materials, imageHash);
        receipt = await liveTx.wait();
        if (receipt && receipt.logs) {
          for (var i = 0; i < receipt.logs.length; i++) {
            try {
              var parsed = state.writeContract.interface.parseLog(receipt.logs[i]);
              if (parsed && parsed.name === "ProductCreated") {
                newProductId = Number(parsed.args.id);
                break;
              }
            } catch (e) {}
          }
        }
        if (!newProductId && state.readContract) {
          newProductId = Number(await state.readContract.getAllProductIds());
        }
      }

      var artisanProfile = await state.readContract.artisans(state.connectedAddress);
      renderGeneratedQrTag(newProductId, name, materials, imageHash, artisanProfile.name);
      submitBtn.disabled = false;

      setFeedback(
        "artisanFeedback",
        "success",
        "Minted Product #" + newProductId + " (Tx: " + truncateAddress(receipt.hash) + ")."
      );

      el("createProductForm").reset();
      el("productImageHashInput").value = "./assets/craft_terracotta_pottery.jpg";
      await loadProductListChips();
    } catch (err) {
      setFeedback("artisanFeedback", "error", extractErrorMessage(err));
    } finally {
      submitBtn.disabled = false;
    }
  }

  function renderGeneratedQrTag(productId, productName, materials, imageHash, artisanName) {
    hideElement(el("qrEmptyState"));
    showElement(el("qrcodeContainer"));
    showElement(el("qrResultCard"));

    el("qrProductTitle").textContent = productName;
    el("qrMaterialsPreview").textContent = materials;
    el("qrProductIdLabel").textContent = "Product #" + productId;
    el("qrArtisanLabel").textContent = "Crafted by " + (artisanName || "Verified Artisan");

    var resolved = resolveProductImage(imageHash, productName);
    if (resolved) el("hangtagLiveThumb").src = resolved;

    var verifyUrl = buildVerificationUrl(window.location.origin, window.location.pathname, productId);
    el("qrVerificationUrl").textContent = verifyUrl;

    var qrContainer = el("qrcodeContainer");
    qrContainer.innerHTML = "";

    if (typeof QRCode !== "undefined") {
      new QRCode(qrContainer, {
        text: verifyUrl,
        width: 176,
        height: 176,
        colorDark: "#231a14",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M,
      });
    } else {
      qrContainer.textContent = "Share link: " + verifyUrl;
    }

    el("previewQrBtn").onclick = function () {
      switchTab("verify");
      loadAndRenderProduct(productId);
    };
  }

  // ---------------------------------------------------------------------------
  // Tab 3: Supply Chain Handoff (Transfer Custody)
  // ---------------------------------------------------------------------------

  async function refreshHandoffPreview() {
    var previewBox = el("handoffPreviewBox");
    var idInput = el("handoffProductId");
    if (!previewBox || !idInput) return;

    var pid = Number(idInput.value);
    if (!Number.isInteger(pid) || pid < 1 || !state.readContract) {
      previewBox.innerHTML = '<p class="muted-text">Enter a valid Product ID to inspect current ownership.</p>';
      return;
    }

    try {
      var details = await state.readContract.getProductDetails(pid);
      if (!details.exists) {
        previewBox.innerHTML = '<p class="muted-text">Product #' + pid + " has not been minted yet.</p>";
        return;
      }

      previewBox.innerHTML = "";
      var dl = document.createElement("dl");
      dl.className = "accession-list";

      var rows = [
        ["Product", "#" + Number(details.id) + " · " + details.name],
        ["Artisan Origin", details.artisanName + " (" + details.originLocation + ")"],
        ["Current Owner", details.currentOwner],
      ];

      rows.forEach(function (pair) {
        var row = document.createElement("div");
        row.className = "accession-row";
        var dt = document.createElement("dt");
        dt.textContent = pair[0];
        var dd = document.createElement("dd");
        if (pair[0] === "Current Owner") {
          var code = document.createElement("code");
          code.className = "mono-value";
          code.textContent = pair[1];
          dd.appendChild(code);
        } else {
          dd.textContent = pair[1];
        }
        row.appendChild(dt);
        row.appendChild(dd);
        dl.appendChild(row);
      });

      previewBox.appendChild(dl);

      if (
        state.connectedAddress &&
        state.connectedAddress.toLowerCase() !== details.currentOwner.toLowerCase()
      ) {
        var warn = document.createElement("p");
        warn.className = "muted-text";
        warn.textContent =
          "Note: Your connected wallet (" +
          truncateAddress(state.connectedAddress) +
          ") is not the current custodian of Product #" +
          pid +
          ".";
        previewBox.appendChild(warn);
      }
    } catch (err) {
      previewBox.textContent = "Unable to load product custody preview.";
    }
  }

  async function handleTransferCustody(event) {
    event.preventDefault();
    clearFeedback("handoffFeedback");

    if (!state.connectedAddress) {
      setFeedback("handoffFeedback", "error", "Connect the current owner wallet first.");
      openWalletModal();
      return;
    }

    var productId = Number(el("handoffProductId").value);
    var nextOwner = el("nextOwnerAddress").value.trim();
    var role = el("handlerRole").value.trim();
    var location = el("handoffLocation").value.trim();
    var statusNote = el("handoffNote").value.trim();

    if (!Number.isInteger(productId) || productId < 1) {
      setFeedback("handoffFeedback", "error", "Enter a valid positive Product ID.");
      return;
    }
    if (!isValidEthereumAddress(nextOwner)) {
      setFeedback("handoffFeedback", "error", "Enter a valid 0x Ethereum wallet address for the next handler.");
      return;
    }
    if (!role || !location || !statusNote) {
      setFeedback("handoffFeedback", "error", "All handoff fields are required.");
      return;
    }

    var submitBtn = el("transferSubmitBtn");
    submitBtn.disabled = true;
    setFeedback("handoffFeedback", "pending", "Recording custody handoff...");

    try {
      var receipt;
      if (state.mode === "preview") {
        var ptx = await state.previewLedger.transferCustody(
          productId,
          nextOwner,
          role,
          location,
          statusNote,
          state.connectedAddress
        );
        receipt = await ptx.wait();
      } else {
        var liveTx = await state.writeContract.transferCustody(
          productId,
          nextOwner,
          role,
          location,
          statusNote
        );
        receipt = await liveTx.wait();
      }
      submitBtn.disabled = false;

      var feedbackEl = el("handoffFeedback");
      feedbackEl.className = "feedback-box feedback-success";
      feedbackEl.innerHTML = "";
      var msgSpan = document.createElement("span");
      msgSpan.textContent =
        "Custody transferred for Product #" +
        productId +
        " (Tx: " +
        truncateAddress(receipt.hash) +
        ").";
      var viewTimelineBtn = document.createElement("button");
      viewTimelineBtn.type = "button";
      viewTimelineBtn.className = "btn-inline";
      viewTimelineBtn.textContent = "View Updated Timeline";
      viewTimelineBtn.addEventListener("click", function () {
        switchTab("verify");
        loadAndRenderProduct(productId);
      });
      feedbackEl.appendChild(msgSpan);
      feedbackEl.appendChild(viewTimelineBtn);
      showElement(feedbackEl);

      el("handoffLocation").value = "";
      el("handoffNote").value = "";
      await refreshHandoffPreview();
      if (state.currentProductId === productId) {
        await loadAndRenderProduct(productId);
      }
    } catch (err) {
      setFeedback("handoffFeedback", "error", extractErrorMessage(err));
    } finally {
      submitBtn.disabled = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Tab 4: Admin Panel (Register & Verify Artisans)
  // ---------------------------------------------------------------------------

  async function loadArtisansDirectory() {
    var listEl = el("artisansDirectoryList");
    var countEl = el("artisanCountLabel");
    if (!listEl || !state.readContract) return;

    try {
      var addresses = await state.readContract.getRegisteredArtisans();
      var profiles = await Promise.all(
        addresses.map(function (addr) {
          return state.readContract.artisans(addr);
        })
      );

      countEl.textContent = addresses.length + " Verified";
      listEl.innerHTML = "";

      if (addresses.length === 0) {
        listEl.innerHTML = '<p class="muted-text">No artisans verified yet.</p>';
        return;
      }

      for (var i = 0; i < addresses.length; i++) {
        var addr = addresses[i];
        var profile = profiles[i];

        var card = document.createElement("div");
        card.className = "directory-item";

        var top = document.createElement("div");
        top.className = "directory-item-top";

        var nameSpan = document.createElement("span");
        nameSpan.className = "directory-name";
        nameSpan.textContent = profile.name;

        var tagSpan = document.createElement("span");
        tagSpan.className = "role-tag role-artisan";
        tagSpan.textContent = "Verified";

        top.appendChild(nameSpan);
        top.appendChild(tagSpan);

        var metaDiv = document.createElement("div");
        metaDiv.className = "directory-meta";
        metaDiv.textContent = profile.craftSpecialty + " · " + profile.location;

        var addrCode = document.createElement("code");
        addrCode.className = "mono-value";
        addrCode.textContent = addr;

        card.appendChild(top);
        card.appendChild(metaDiv);
        card.appendChild(addrCode);
        listEl.appendChild(card);
      }
    } catch (err) {
      listEl.textContent = "Unable to load artisans directory.";
    }
  }

  async function handleRegisterArtisan(event) {
    event.preventDefault();
    clearFeedback("adminFeedback");

    if (!state.connectedAddress) {
      setFeedback("adminFeedback", "error", "Connect the Administrator wallet first.");
      openWalletModal();
      return;
    }

    var wallet = el("artisanWalletInput").value.trim();
    var name = el("artisanNameInput").value.trim();
    var specialty = el("craftSpecialtyInput").value.trim();
    var location = el("artisanLocationInput").value.trim();

    if (!isValidEthereumAddress(wallet)) {
      setFeedback("adminFeedback", "error", "Enter a valid 0x Ethereum wallet address.");
      return;
    }
    if (!name || !specialty || !location) {
      setFeedback("adminFeedback", "error", "All artisan profile fields are required.");
      return;
    }

    var submitBtn = el("registerArtisanSubmitBtn");
    submitBtn.disabled = true;
    setFeedback("adminFeedback", "pending", "Registering verified artisan...");

    try {
      var receipt;
      if (state.mode === "preview") {
        var ptx = await state.previewLedger.registerArtisan(
          wallet,
          name,
          specialty,
          location,
          state.connectedAddress
        );
        receipt = await ptx.wait();
      } else {
        var liveTx = await state.writeContract.registerArtisan(wallet, name, specialty, location);
        receipt = await liveTx.wait();
      }

      setFeedback(
        "adminFeedback",
        "success",
        "Artisan " + name + " verified on-chain (Tx: " + truncateAddress(receipt.hash) + ")."
      );

      el("registerArtisanForm").reset();
      await loadArtisansDirectory();
      await refreshWalletRoleUI();
    } catch (err) {
      setFeedback("adminFeedback", "error", extractErrorMessage(err));
    } finally {
      submitBtn.disabled = false;
    }
  }

  function extractErrorMessage(err) {
    if (!err) return "Transaction failed.";
    if (err.reason) return err.reason;
    if (err.shortMessage) return err.shortMessage;
    if (err.message) return err.message;
    return "Transaction failed.";
  }

  // ---------------------------------------------------------------------------
  // Event Wiring & Bootstrap
  // ---------------------------------------------------------------------------

  async function bootstrap() {
    populateSignerControls();

    // Tab navigation
    document.querySelectorAll(".nav-tab").forEach(function (btn) {
      btn.addEventListener("click", function () {
        switchTab(btn.getAttribute("data-tab"));
      });
    });

    // Interactive hero motif tiles
    document.querySelectorAll("[data-motif-action]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var action = btn.getAttribute("data-motif-action");
        if (action === "admin") {
          switchTab("admin");
        } else if (action === "artisan") {
          switchTab("artisan");
        } else if (action === "materials") {
          var cert = el("certificateCard");
          if (cert) cert.scrollIntoView({ behavior: "smooth", block: "start" });
        } else if (action === "journey") {
          var journey = el("journeyStepper");
          if (journey) journey.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
    });

    // Wallet & Modal controls
    el("connectWalletBtn").addEventListener("click", handleConnectWalletButtonClick);
    el("closeWalletModalBtn").addEventListener("click", closeWalletModal);
    el("walletModal").addEventListener("click", function (e) {
      if (e.target === el("walletModal")) closeWalletModal();
    });
    el("modalMetaMaskBtn").addEventListener("click", function () {
      connectMetaMask(false);
    });
    el("copyRpcUrlBtn").addEventListener("click", function () {
      var btn = el("copyRpcUrlBtn");
      if (navigator.clipboard) {
        navigator.clipboard.writeText("http://127.0.0.1:8545");
        btn.textContent = "Copied";
        setTimeout(function () {
          btn.textContent = "Copy RPC";
        }, 1500);
      }
    });

    // EIP-6963 & delayed MetaMask discovery
    window.addEventListener("eip6963:announceProvider", function (event) {
      if (event && event.detail && event.detail.provider) {
        discoveredEip6963Providers.push(event.detail);
        updateWalletModalMetaMaskState();
      }
    });
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    window.addEventListener("ethereum#initialized", function () {
      updateWalletModalMetaMaskState();
    });

    el("demoAccountSelect").addEventListener("change", function (e) {
      connectLocalRole(e.target.value);
    });
    el("copyWalletBtn").addEventListener("click", function () {
      if (state.connectedAddress && navigator.clipboard) {
        navigator.clipboard.writeText(state.connectedAddress);
      }
    });
    el("disconnectWalletBtn").addEventListener("click", disconnectWallet);

    el("reconnectNodeBtn").addEventListener("click", async function () {
      await initReadProvider();
      await loadProductListChips();
      await loadAndRenderProduct(state.currentProductId);
      await loadArtisansDirectory();
      await refreshWalletRoleUI();
    });

    el("useDemoArtisanBtn").addEventListener("click", function () {
      var accounts = getDemoAccounts();
      if (accounts[1]) connectLocalRole(accounts[1].address);
    });
    el("useDemoAdminBtn").addEventListener("click", function () {
      var accounts = getDemoAccounts();
      if (accounts[0]) connectLocalRole(accounts[0].address);
    });

    // Verification search form
    el("verifySearchForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var val = Number(el("searchProductId").value);
      if (!Number.isInteger(val) || val < 1) {
        hideElement(el("certificateCard"));
        el("verifyErrorTitle").textContent = "Invalid Product ID";
        el("verifyErrorMessage").textContent = "Enter a positive whole number Product ID (e.g. 1).";
        showElement(el("verifyError"));
        return;
      }
      loadAndRenderProduct(val);
    });

    // Artisan form, presets, & live hangtag studio updates
    el("createProductForm").addEventListener("submit", handleCreateProduct);
    el("productNameInput").addEventListener("input", updateHangtagLivePreview);
    el("productMaterialsInput").addEventListener("input", updateHangtagLivePreview);
    el("productImageHashInput").addEventListener("input", updateHangtagLivePreview);
    document.querySelectorAll(".preset-hash-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        el("productImageHashInput").value = btn.getAttribute("data-hash");
        updateHangtagLivePreview();
      });
    });
    el("printQrBtn").addEventListener("click", function () {
      window.print();
    });

    // Handoff form
    el("handoffProductId").addEventListener("change", refreshHandoffPreview);
    el("handoffProductId").addEventListener("input", refreshHandoffPreview);
    el("transferCustodyForm").addEventListener("submit", handleTransferCustody);

    // Admin form
    el("registerArtisanForm").addEventListener("submit", handleRegisterArtisan);

    // MetaMask account/chain listeners
    var eth = getMetaMaskProvider();
    if (eth && typeof eth.on === "function") {
      eth.on("accountsChanged", function (accounts) {
        if (!accounts || accounts.length === 0) disconnectWallet();
        else if (state.walletMode === "metamask") connectMetaMask(true);
      });
      eth.on("chainChanged", function () {
        if (state.walletMode === "metamask") connectMetaMask(true);
      });
    }

    // Read query param ?id=<N> and load initial public view
    var queryId = parseProductIdFromSearch(window.location.search);
    var initialId = queryId || 1;
    switchTab("verify");
    updateHangtagLivePreview();

    await initReadProvider();
    // Auto-reconnect MetaMask silently if user already authorized this origin
    await connectMetaMask(true);
    await refreshWalletRoleUI();
    await loadProductListChips();
    await loadAndRenderProduct(initialId);
    await loadArtisansDirectory();
  }

  document.addEventListener("DOMContentLoaded", bootstrap);
})(typeof window !== "undefined" ? window : globalThis);
