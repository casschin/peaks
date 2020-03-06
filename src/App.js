import React, { useRef, useState, useEffect } from "react";
import "./index.css";
import Peaks from "peaks.js";
import styled from "styled-components";

const SHOWS = ["joerogan", "replyall", "parcast"];

export default function App() {
  const [points, setPoints] = useState([]);
  const [selectedShow, setShow] = useState(SHOWS[0]);
  const [peakInstance, setPeakInstance] = useState(null);
  const [playState, setPlayState] = useState("stopped");
  const zoomviewRef = useRef(null);
  const overviewRef = useRef(null);
  const audioElement = useRef(null);
  const pointInputRef = useRef(null);

  useEffect(() => {
    function onSpacebar() {
      switch (playState) {
        case "stopped":
        case "paused":
          peakInstance.player.play();
          setPlayState("playing");
          break;
        case "playing":
          peakInstance.player.pause();
          setPlayState("paused");
          break;
        default:
          throw new Error("unexpected play state");
      }
    }

    function onLeft() {
      const currentTime = peakInstance.player.getCurrentTime();
      peakInstance.player.seek(currentTime - 5);
    }
    function onRight() {
      const currentTime = peakInstance.player.getCurrentTime();
      peakInstance.player.seek(currentTime + 5);
    }
    if (peakInstance) {
      peakInstance.on("keyboard.space", onSpacebar);
      peakInstance.on("keyboard.left", onLeft);
      peakInstance.on("keyboard.right", onRight);
    }
    return () => {
      if (peakInstance) {
        peakInstance.off("keyboard.space", onSpacebar);
        peakInstance.off("keyboard.left", onLeft);
        peakInstance.off("keyboard.right", onRight);
      }
    };
  }, [peakInstance, playState]);

  useEffect(() => {
    const options = {
      containers: {
        zoomview: zoomviewRef.current,
        overview: overviewRef.current
      },
      mediaUrl: `/data/${selectedShow}.mp3`,
      mediaElement: audioElement.current,
      dataUri: {
        arraybuffer: `/data/${selectedShow}.dat`,
        json: `/data/${selectedShow}.json`
      },
      keyboard: true,
      pointMarkerColor: "#006eb0",
      showPlayheadTime: true,
      height: 200,
      zoomLevels: [256, 512, 1024, 2048, 4096, 8192],
      points: points.map(point => {
        return { time: point };
      })
    };
    if (peakInstance === null) {
      Peaks.init(options, function(err, instance) {
        if (err) {
          console.error(err);
          return;
        }
        const zoomview = instance.views.getView("zoomview");
        const overview = instance.views.getView("overview");

        zoomview.setAmplitudeScale(0.5);
        instance.zoom.setZoom(5);

        overview.setAmplitudeScale(0.5);
        overviewRef.current.setAttribute("style", "height: 100px");
        overview.fitToContainer();
        setPeakInstance(instance);
      });
    }
  }, [peakInstance, points, selectedShow]);
  useEffect(() => {
    async function fetchFile() {
      const response = await fetch("/data/test.txt");
      const blob = await response.blob();
      console.log(URL.createObjectURL(blob));
    }
    fetchFile();
  }, []);
  return (
    <Container>
      <h1>waveform!</h1>
      <ShowSwitcherWrapper>
        {SHOWS.map(show => {
          return (
            <ShowButton
              key={`switch-${show}`}
              onClick={() => {
                setShow(show);
                setPeakInstance(null);
              }}
              isSelected={show === selectedShow}
            >
              {show}
            </ShowButton>
          );
        })}
      </ShowSwitcherWrapper>
      <div id="zoomview" ref={zoomviewRef} />
      <div id="overview" ref={overviewRef} />
      <Audio src={`/data/${selectedShow}.mp3`} controls ref={audioElement} />
      {peakInstance !== null && (
        <div>
          <button
            onClick={() => {
              switch (playState) {
                case "playing":
                  peakInstance.player.pause();
                  setPlayState("paused");
                  break;
                case "paused":
                case "stopped":
                  peakInstance.player.play();
                  setPlayState("playing");
                  break;
                default:
                  throw new Error("unexpected play state");
              }
            }}
          >
            {playState === "playing" ? "paused" : "play"}
          </button>
          <button
            disabled={playState === "stopped"}
            onClick={() => {
              peakInstance.player.pause();
              peakInstance.player.seek(0);
              setPlayState("stopped");
            }}
          >
            stop
          </button>
          <button
            onClick={() => {
              peakInstance.zoom.zoomIn();
            }}
          >
            zoom in
          </button>
          <button
            onClick={() => {
              peakInstance.zoom.zoomOut();
            }}
          >
            zoom out
          </button>
          <button
            onClick={() => {
              const currentTime = peakInstance.player.getCurrentTime();
              const newPoint = {
                time: currentTime
              };
              peakInstance.points.add(newPoint);
              setPoints([...points, currentTime]);
            }}
          >
            add point
          </button>
        </div>
      )}
      <div>
        <h3>points</h3>
        <input
          placeholder="add point"
          ref={pointInputRef}
          type="number"
          min="0"
        />
        <button
          onClick={() => {
            const value = pointInputRef.current.value;
            if (value.length > 0) {
              const valueInt = parseInt(value);
              const duration = peakInstance.player.getDuration();
              if (valueInt > 0 && valueInt < duration) {
                setPoints([...points, valueInt]);
                peakInstance.points.add({ time: valueInt });
                pointInputRef.current.value = "";
              } else {
                alert("point is outside the length of the audio");
              }
            }
          }}
        >
          add
        </button>
        <ul>
          {points.sort().map(currentPoint => {
            return (
              <li key={`point-${currentPoint}`}>
                {currentPoint}{" "}
                <button
                  onClick={() => {
                    peakInstance.player.seek(currentPoint);
                    peakInstance.player.play();
                    setPlayState("playing");
                  }}
                >
                  play
                </button>{" "}
                <button
                  onClick={() => {
                    peakInstance.points.removeByTime(currentPoint);
                    setPoints(points.filter(point => point !== currentPoint));
                  }}
                >
                  remove
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </Container>
  );
}

const Container = styled.div`
  padding: 24px;
`;

const ShowSwitcherWrapper = styled.div`
  display: flex;
`;

const ShowButton = styled.button`
  font-weight: ${props => (props.isSelected ? "bold" : "normal")};
`;

const Audio = styled.audio`
  visibility: hidden;
`;
