/* globals bootstrap, YT */

import { render, html } from "https://cdn.jsdelivr.net/npm/lit-html@3/+esm";
import { unsafeHTML } from "https://cdn.jsdelivr.net/npm/lit-html@3/directives/unsafe-html.js";
import { marked } from "https://cdn.jsdelivr.net/npm/marked@12/lib/marked.esm.js";

const youtubeScript = document.createElement("script");
youtubeScript.src = "https://www.youtube.com/iframe_api";
const firstScriptTag = document.getElementsByTagName("script")[0];
firstScriptTag.parentNode.insertBefore(youtubeScript, firstScriptTag);
let player;

const $home = document.querySelector("#home");
const $app = document.querySelector("#app");
const $transcript = document.querySelector("#transcript");
const $highlights = document.querySelector("#highlights");
const config = await fetch("config.json").then((r) => r.json());

// Filter videos. #jhi filters for source="jhi", etc.
const filter = location.hash.slice(1);
let videos = filter
  ? Object.fromEntries(Object.entries(config.videos).filter(([, video]) => video.source == filter))
  : config.videos;
if (!Object.keys(videos).length) videos = config.videos;

let currentAdvisorId;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let transcriptData;

const homePage = html`
  <h1 class="display-1 my-5 text-center">K12 Video Analysis</h1>
  <h2 class="h3 mb-4 text-center text-muted">Personalized Learning Pathways to Nurture Every Student's Unique Potential</h2>
  <div class="mx-auto my-5 narrative">
    <h2 class="h5">Every Student Has a Story</h2>
    <q>Understanding each student's unique background, strengths, and challenges helps create personalized educational experiences.</q>
    <h2 class="h5 mt-3">Personalized Learning</h2>
    <q>Discover educational content tailored to each student's needs. Because effective learning isn't one-size-fits-all—it's about how content connects with <strong>each student</strong>.</q>
  </div>

  <hr class="my-5" />
  <div class="row row-cols-1 row-cols-sm-2 row-cols-md-2 row-cols-lg-3 align-items-stretch">
  ${Object.entries(config.advisors).map(
    ([id, student]) => html`
      <div class="col-md mb-3">
        <div class="card h-100">
          <img src="${student.img}" class="card-img-top" alt="Profile picture of ${student.name}" />
          <div class="card-body">
            <h5 class="card-title">${student.name}</h5>
            <h6 class="card-subtitle mb-2">${student.grade} | ${student["school-type"]}</h6>
            <div class="card-text">
              <div class="mb-3">
                <h6 class="text-primary">Academic Profile</h6>
                <p class="mb-1"><strong>Specialties</strong>: ${student.specialties || "N/A"}</p>
                <p class="mb-1">
                  <strong>Grades</strong>:
                  ${student["academic-performance"] && student["academic-performance"].grades
                    ? student["academic-performance"].grades
                    : "N/A"}
                </p>
                <p class="mb-1">
                  <strong>Assessment Scores</strong>:
                  ${student["academic-performance"] && student["academic-performance"]["assessment-scores"]
                    ? student["academic-performance"]["assessment-scores"]
                    : "N/A"}
                </p>
                <p class="mb-1">
                  <strong>Attendance</strong>:
                  ${student["academic-performance"] && student["academic-performance"].attendance
                    ? student["academic-performance"].attendance
                    : "N/A"}
                </p>
              </div>

              <div class="mb-3">
                <h6 class="text-primary">Goals & Challenges</h6>
                <p class="mb-1"><strong>Goals</strong>:</p>
                <ul>
                  ${student.goals.map((goal) => html`<li>${goal}</li>`)}
                </ul>
                <p class="mb-1"><strong>Challenges</strong>:</p>
                <ul>
                  ${student.challenges.map((challenge) => html`<li>${challenge}</li>`)}
                </ul>
                <p class="mb-1"><strong>Interests</strong>: ${student.interests}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `
  )}
  </div>

  <div class="mx-auto my-5 narrative">
    <h2>Next, we personalize video transcripts</h2>
    <p>Let's look at these ${Object.keys(videos).length} public videos that provide information to the students..</p>
  </div>

  <div class="videos row row-cols-1 row-cols-sm-2 row-cols-lg-3">
    ${Object.entries(videos).map(
      ([key, video]) => html`
        <div class="col py-3">
          <a class="video card h-100 text-decoration-none" href="#?${new URLSearchParams({ video: key })}">
            <div class="card-body">
              <h5 class="card-title">${video.title}</h5>
              <p class="card-text">
                <img class="img-fluid" src="https://img.youtube.com/vi/${video.youtube}/0.jpg" />
              </p>
            </div>
          </a>
        </div>
      `
    )}
  </div>

  <div class="mx-auto my-5 narrative">
    <p><strong>Click any of the videos above to experience how we:</strong></p>
    <ol>
      <li>Extract and timestamp the video transcript</li>
      <li>Leverage an LLM to deliver personalized summaries, boosting student engagement and experience</li>
    </ol>
  </div>

</div>
`;

const renderSegment = ({ id, start, text, avg_logprob }) =>
  html`<span class="seek" data-start="${start}" data-id="${id}" data-logprob="${avg_logprob}">${text}</span>`;

async function renderApp(videoId, advisorId) {
  const video = config.videos[videoId];
  transcriptData = await fetch(video.transcript).then((r) => r.json());

  // Group segments into paragraphs that end with ?, ! or .
  let paragraphs = [[]];
  for (const segment of transcriptData.segments) {
    paragraphs.at(-1).push(segment);
    if (segment.text.match(/[.?!]\s*$/)) paragraphs.push([]);
  }
  paragraphs = paragraphs.filter((p) => p.length);

  render(
    html`
      <h2 class="my-3">Transcript</h2>
      <p class="small text-secondary">
        <i class="bi bi-magic text-primary fs-5"></i> Transcripts with timings are dynamically generated from the video.
      </p>
      ${paragraphs.map((segments) => html`<p>${segments.map(renderSegment)}</p>`)}
    `,
    $transcript
  );
  player.cueVideoById(video.youtube);

  transcriptData.segments.forEach((segment) => {
    segment.element = $transcript.querySelector(`[data-id="${segment.id}"]`);
  });

  if (!(advisorId in config.advisors)) advisorId = Object.keys(config.advisors)[0];
  const advisor = config.advisors[advisorId];
  currentAdvisorId = advisorId;

  render(
    html`
      <div class="my-3 d-flex justify-content-between">
        <h2>Highlights</h2>
        <div class="dropdown">
          <button
            class="btn btn-primary dropdown-toggle"
            type="button"
            data-bs-toggle="dropdown"
            aria-expanded="false"
          >
            For ${advisor.name}
          </button>
          <ul class="dropdown-menu dropdown-menu-end">
            ${Object.entries(config.advisors).map(
              ([id, student]) =>
                html`<li>
                  <a
                    class="dropdown-item d-flex align-items-center ${id == advisorId ? "active" : ""}"
                    href="#?${new URLSearchParams({ video: videoId, advisor: id })}"
                  >
                    <img src="${student.img}" class="rounded-circle me-3" height="40" />
                    <div>
                      <h5 class="my-0">${student.name}</h5>
                    </div>
                  </a>
                </li> `
            )}
          </ul>
        </div>
      </h2>
    </div>
    <div id="advisor-highlights" class="my-3">
      <p class="small text-secondary"><i class="bi bi-magic text-primary fs-5"></i> Educational content is dynamically generated based on the student's profile.</p>
      <div id="animated-text"></div>
    </div>
    <hr class="my-5">
    <div id="advisor-profile" class="my-3">
      <div class="d-flex">
        <img src="${advisor.img}" class="rounded-circle me-3" height="100" />
        <div>
          <h2>${advisor.name}</h2>
          <p>${advisor.grade} | ${advisor["school-type"]}</p>
        </div>
      </div>
      <div class="mt-3">
        <p><strong>Specialties</strong>: ${advisor.specialties || "N/A"}</p>
        <p><strong>Academic Performance</strong>:</p>
        <ul>
          <li>Grades: ${
            advisor["academic-performance"] && advisor["academic-performance"].grades
              ? advisor["academic-performance"].grades
              : "N/A"
          }</li>
          <li>Assessment Scores: ${
            advisor["academic-performance"] && advisor["academic-performance"]["assessment-scores"]
              ? advisor["academic-performance"]["assessment-scores"]
              : "N/A"
          }</li>
          <li>Attendance: ${
            advisor["academic-performance"] && advisor["academic-performance"].attendance
              ? advisor["academic-performance"].attendance
              : "N/A"
          }</li>
        </ul>
        <p><strong>Goals</strong>:</p>
        <ul>
          ${advisor.goals.map((goal) => html`<li>${goal}</li>`)}
        </ul>
        <p><strong>Challenges</strong>:</p>
        <ul>
          ${advisor.challenges.map((challenge) => html`<li>${challenge}</li>`)}
        </ul>
        <p><strong>Interests</strong>: ${advisor.interests}</p>
      </div>
    </div>
    `,
    $highlights
  );

  // Handle the case where there are no highlights for this student
  if (!advisor.highlights || !advisor.highlights[videoId]) {
    const $animatedText = $highlights.querySelector("#animated-text");
    render(html`<p>No personalized content available for this student and video combination.</p>`, $animatedText);
    return;
  }

  const chunks = advisor.highlights[videoId];
  const $animatedText = $highlights.querySelector("#animated-text");
  const highlights = [];
  for (let i = 0; i < chunks.length; i++) {
    const { p, start_time } = chunks[i];
    for (let j = 0; j < p.length; j += 8) {
      highlights[i] = html`<p>${p.slice(0, j + 1)}</p>`;
      render(highlights, $animatedText);
      await sleep(10);
      if (currentAdvisorId !== advisorId) return;
    }
    const m = Math.floor(start_time / 60);
    const s = Math.floor(start_time % 60);
    highlights[i] = unsafeHTML(
      marked.parse(
        p + (start_time ? ` <a href="#${start_time}" class="seek" title="See relevant clip">${m}m ${s}s</a>` : "")
      )
    );
    render(highlights, $animatedText);
  }
}

// When a segment is clicked, jump to that segment in the video
$app.addEventListener("click", (e) => {
  const $segment = e.target.closest("[data-start], .seek");
  if ($segment) {
    e.preventDefault();
    player.seekTo($segment.dataset.start ?? $segment.getAttribute("href").slice(1), true);
    if (player.getPlayerState() != 1) player.playVideo();
  }
});

const errorPage = html`
  <div class="alert alert-danger alert-dismissible my-5 text-center" role="alert">
    <h4 class="alert-heading">Video not found.</h4>
    <div>Please try another one.</div>
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
  </div>
`;

function show(ids) {
  for (const [id, show] of Object.entries(ids)) document.getElementById(id).classList.toggle("d-none", !show);
  window.scrollTo(0, 0);
}

async function redraw() {
  const hash = new URLSearchParams(location.hash.slice(1));
  const videoId = hash.get("video");
  const validVideo = videoId in config.videos;
  // TODO: Clear the app, since YouTube API might mess things up?
  // Render the home page if no id is provided
  if (!videoId) {
    show({ home: true, screen: false, app: false });
    render(homePage, $home);
  } else if (!validVideo) {
    show({ home: true, screen: false, app: false });
    render([errorPage, homePage], $app);
  }
  // Render the video page if id is provided, possibly with an error
  else {
    show({ home: false, screen: true, app: true });
    await renderApp(videoId, hash.get("advisor"));
  }
  initTooltips();
}

window.addEventListener("hashchange", redraw);

// Initialize tooltips
function initTooltips() {
  const tooltips = document.querySelectorAll('[data-bs-toggle="tooltip"]');
  tooltips.forEach((el) => {
    if (!bootstrap.Tooltip.getInstance(el)) {
      new bootstrap.Tooltip(el, {
        trigger: "hover",
        placement: "right",
        html: false,
      });
    }
  });
}

document.addEventListener("DOMContentLoaded", initTooltips);

window.onYouTubeIframeAPIReady = function () {
  player = new YT.Player("video", {
    height: "360",
    width: "640",
    playerVars: { autoplay: 0, playsinline: 1, modestbranding: 1, rel: 0 },
    events: {
      onReady: () => {
        $home.innerHTML = "";
        redraw();
      },
      onStateChange: onPlayerStateChange,
    },
  });
};

let videoPlayingInterval;
function onPlayerStateChange(event) {
  if (event.data === YT.PlayerState.PLAYING) {
    videoPlayingInterval = setInterval(updatePosition, 200);
    updatePosition();
  } else clearInterval(videoPlayingInterval);
}

function updatePosition() {
  const time = player.getCurrentTime();
  // find the segment that contains this time
  const segment = transcriptData.segments.find((seg) => seg.start <= time && time < seg.end);
  if (segment) transcriptData.segments.forEach((seg) => seg.element.classList.toggle("highlight", seg === segment));
}
