"use strict";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const header = document.querySelector(".site-header");
const nav = document.getElementById("site-nav");
const navToggle = document.querySelector(".nav-toggle");
const navLabel = navToggle?.querySelector(".sr-only");

const updateHeader = () => {
  header?.classList.toggle("is-scrolled", window.scrollY > 8);
};

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

const setNavOpen = (open) => {
  if (!nav || !navToggle) return;
  nav.classList.toggle("is-open", open);
  navToggle.setAttribute("aria-expanded", String(open));
  if (navLabel) navLabel.textContent = open ? "Закрыть меню" : "Открыть меню";
};

navToggle?.addEventListener("click", () => {
  setNavOpen(!nav?.classList.contains("is-open"));
});

nav?.addEventListener("click", (event) => {
  if (event.target.closest("a")) setNavOpen(false);
});

document.addEventListener("click", (event) => {
  if (!nav?.classList.contains("is-open")) return;
  if (nav.contains(event.target) || navToggle?.contains(event.target)) return;
  setNavOpen(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !nav?.classList.contains("is-open")) return;
  setNavOpen(false);
  navToggle?.focus();
});

const navLinks = nav ? [...nav.querySelectorAll('a[href^="#"]')] : [];
const navTargets = navLinks
  .map((link) => {
    const id = link.getAttribute("href")?.slice(1);
    const target = id ? document.getElementById(id) : null;
    return target ? { id, target } : null;
  })
  .filter(Boolean);

let spyFrame = 0;

const updateActiveLink = () => {
  spyFrame = 0;
  if (!navTargets.length) return;

  const marker = window.scrollY + Math.min(window.innerHeight * 0.34, 260);
  const positions = navTargets
    .map((entry) => ({
      ...entry,
      top: entry.target.getBoundingClientRect().top + window.scrollY
    }))
    .sort((a, b) => a.top - b.top);

  let active = positions[0];
  for (const entry of positions) {
    if (entry.top <= marker) active = entry;
  }

  const atBottom =
    window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
  if (atBottom) active = positions[positions.length - 1];

  navLinks.forEach((link) => {
    link.classList.toggle("is-active", link.getAttribute("href") === `#${active.id}`);
  });
};

const queueActiveLinkUpdate = () => {
  if (spyFrame) return;
  spyFrame = window.requestAnimationFrame(updateActiveLink);
};

queueActiveLinkUpdate();
window.addEventListener("scroll", queueActiveLinkUpdate, { passive: true });
window.addEventListener("resize", queueActiveLinkUpdate);
window.addEventListener("load", queueActiveLinkUpdate);

const topicSelect = document.getElementById("topic");
const feedbackCard = document.getElementById("feedback");
const formStatus = document.getElementById("form-status");
const feedbackForm = document.getElementById("feedback-form");

const setFormStatus = (message, { error = false } = {}) => {
  if (!formStatus) return;
  formStatus.textContent = message;
  formStatus.classList.toggle("is-error", error);
};

const clearFormStatus = () => {
  setFormStatus("");
};

document.querySelectorAll("[data-topic]").forEach((button) => {
  button.addEventListener("click", () => {
    const topic = button.dataset.topic;
    if (!topicSelect || !feedbackCard) return;

    const option = [...topicSelect.options].find(
      (item) => item.value === topic || item.textContent.trim() === topic
    );
    if (option) topicSelect.value = option.value;

    clearFormStatus();
    feedbackCard.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "start"
    });

    window.setTimeout(
      () => topicSelect.focus({ preventScroll: true }),
      reducedMotion ? 0 : 550
    );
  });
});

const lightbox = document.getElementById("lightbox");
const lightboxImage = lightbox?.querySelector("img");
const lightboxClose = lightbox?.querySelector(".lightbox-close");
let lightboxTrigger = null;

const closeLightbox = () => {
  if (!lightbox) return;
  if (typeof lightbox.close === "function" && lightbox.open) {
    lightbox.close();
  } else {
    lightbox.removeAttribute("open");
    document.body.classList.remove("lightbox-open");
  }
};

document.querySelectorAll("[data-lightbox]").forEach((button) => {
  button.addEventListener("click", () => {
    if (!lightbox || !lightboxImage) return;
    lightboxTrigger = button;
    lightboxImage.src = button.dataset.lightbox;
    lightboxImage.alt = button.dataset.alt || "";
    document.body.classList.add("lightbox-open");

    if (typeof lightbox.showModal === "function") {
      lightbox.showModal();
    } else {
      lightbox.setAttribute("open", "");
    }
  });
});

lightboxClose?.addEventListener("click", closeLightbox);

lightbox?.addEventListener("click", (event) => {
  if (event.target === lightbox) closeLightbox();
});

lightbox?.addEventListener("close", () => {
  document.body.classList.remove("lightbox-open");
  if (lightboxImage) {
    lightboxImage.removeAttribute("src");
    lightboxImage.alt = "";
  }
  lightboxTrigger?.focus();
});

const resetCaptcha = () => {
  if (typeof window.grecaptcha?.reset === "function") {
    window.grecaptcha.reset();
  }
};

feedbackForm?.addEventListener("input", clearFormStatus);

feedbackForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!formStatus) return;

  const data = new FormData(feedbackForm);

  if (data.get("company")) {
    formStatus.textContent = "Спасибо!";
    formStatus.classList.remove("is-error");
    feedbackForm.reset();
    return;
  }

  const topic = String(data.get("topic") || "").trim();
  const message = String(data.get("message") || "").trim();
  const consent = data.get("consent") === "on";

  if (!topic || !message) {
    formStatus.textContent = "Заполните тему и сообщение.";
    formStatus.classList.add("is-error");
    feedbackForm.reportValidity();
    return;
  }

  if (!consent) {
    formStatus.textContent = "Подтвердите согласие на обработку сообщения.";
    formStatus.classList.add("is-error");
    feedbackForm.reportValidity();
    return;
  }

  data.set("page", window.location.href);
  data.set("submittedAt", new Date().toISOString());

  formStatus.textContent = "Отправляю сообщение…";
  formStatus.classList.remove("is-error");

  try {
    const response = await fetch("/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams(data).toString()
    });

    if (!response.ok) throw new Error(`Request failed: ${response.status}`);

    formStatus.textContent = "Сообщение отправлено. Спасибо!";
    formStatus.classList.remove("is-error");
    feedbackForm.reset();
    resetCaptcha();
  } catch {
    formStatus.textContent = "Не удалось отправить сообщение. Проверьте капчу и попробуйте ещё раз.";
    formStatus.classList.add("is-error");
    resetCaptcha();
  }
});
