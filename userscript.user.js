// ==UserScript==
// @name         KyoAni template
// @namespace    http://tampermonkey.net/
// @version      0.8
// @description  try to take over the canvas!
// @author       oralekin, LittleEndu, ekgame, Wieku, DeadRote, exdeejay (xDJ_), 101arrowz
// @match        https://hot-potato.reddit.com/embed*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=reddit.com
// @grant        GM_xmlhttpRequest
// ==/UserScript==
if (window.top !== window.self) {
    window.addEventListener('load', () => {
        let lastVersion = new Date().getTime();

        const full = "https://i.ibb.co/W3KGJPz/Kyoani-Canvas.png";

        //region image manipulation
        const getImageData = async () => {
            const blob = new Blob([new Uint8Array(await new Promise(resolve => {
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: full + "?" + lastVersion,
                    responseType: 'arraybuffer',
                    onload: function (response) {
                        resolve(response.response);
                    }
                });
            }))], {type: 'image/png'});
            const dataURL = await new Promise(resolve => {
                const fr = new FileReader();
                fr.onload = () => {
                    resolve(fr.result);
                }
                fr.readAsDataURL(blob);
            });
            const tmpImg = document.createElement('img');
            tmpImg.src = dataURL;
            await new Promise(resolve => tmpImg.onload = resolve);
            const cnv = document.createElement('canvas');
            cnv.width = tmpImg.width;
            cnv.height = tmpImg.height;
            const tmpCtx = cnv.getContext('2d');
            tmpCtx.drawImage(tmpImg, 0, 0);
            return tmpCtx.getImageData(0, 0, cnv.width, cnv.height);
        };

        const ditherMask = (src) => {
            const dithered = new ImageData(src.width * 3, src.height * 3);
            const masked = new ImageData(src.width, src.height);
            for (let y = 0; y < src.height; ++y) {
                for (let x = 0; x < src.width; ++x) {
                    const srcPx = (y * src.width + x) * 4;
                    const tgtPx = ((y * 3 + 1) * dithered.width + (x * 3 + 1)) * 4;

                    dithered.data[tgtPx] = src.data[srcPx];
                    dithered.data[tgtPx + 1] = src.data[srcPx + 1];
                    dithered.data[tgtPx + 2] = src.data[srcPx + 2];
                    dithered.data[tgtPx + 3] = src.data[srcPx + 3];

                    masked.data[srcPx + 3] = 255 - src.data[srcPx + 3];
                }
            }
            return [dithered, masked];
        };

        const convertToURI = async (data) => {
            const cnv = document.createElement('canvas');
            cnv.width = data.width;
            cnv.height = data.height;
            cnv.getContext('2d').putImageData(data, 0, 0);
            const blob = await new Promise(resolve => cnv.toBlob(resolve, 'image/png'));

            return await new Promise(resolve => {
                const fr = new FileReader();
                fr.onload = () => {
                    resolve(fr.result);
                }
                fr.readAsDataURL(blob);
            });
        }

        //endregion

        const dottedOverlay = document.createElement("img");
        dottedOverlay.onload = () => {
            let opacity = dottedOverlay.style.opacity; // Preserve opacity during refresh
            dottedOverlay.style = `position: absolute; left: 0; top: 0; width: 2000px; height: 2000px; image-rendering: pixelated; z-index: 1`;
            dottedOverlay.style.opacity = opacity;
        };

        const maskOverlay = document.createElement("img");
        maskOverlay.style.opacity = 0;
        maskOverlay.onload = () => {
            let opacity = maskOverlay.style.opacity; // Preserve opacity during refresh
            maskOverlay.style = `position: absolute; left: 0; top: 0; width: 2000px; height: 2000px; image-rendering: pixelated; z-index: 2`;
            maskOverlay.style.opacity = opacity;
        };

        const fullOverlay = document.createElement("img");
        fullOverlay.src = full + "?" + lastVersion;
        fullOverlay.style.opacity = 0;

        fullOverlay.onload = () => {
            let opacity = fullOverlay.style.opacity; // Preserve opacity during refresh
            fullOverlay.style = `position: absolute; left: 0; top: 0; width: 2000px; height: 2000px; image-rendering: pixelated; z-index: 3`;
            fullOverlay.style.opacity = opacity;
        };

        // Add the image as overlay
        const camera = document.querySelector("mona-lisa-embed").shadowRoot.querySelector("mona-lisa-camera");
        const canvas = camera.querySelector("mona-lisa-canvas");

        canvas.shadowRoot.querySelector('.container').appendChild(dottedOverlay);
        canvas.shadowRoot.querySelector('.container').appendChild(maskOverlay);
        canvas.shadowRoot.querySelector('.container').appendChild(fullOverlay);

        const updateImages = async () => {
            const data = await getImageData();

            const [dithered, masked] = ditherMask(data);

            dottedOverlay.src = await convertToURI(dithered);
            maskOverlay.src = await convertToURI(masked);
        };

        updateImages(); // load images now

        //Insert element after another element
        function insertAfter(newNode, referenceNode) {
            referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
        }

        //Slider initialization
        function initSlider() {
            let visSlider = document.createElement("div");

            visSlider.style = `
                     position: fixed;
                     left: calc(var(--sail) + 16px);
                     right: calc(var(--sair) + 16px);
                     display: flex;
                     flex-flow: row nowrap;
                     align-items: center;
                     justify-content: center;
                     height: 40px;
                     top: calc(var(--sait) + 48px);
                     text-shadow: black 1px 0 10px;
                     text-align:center;
                `;

            //Text
            let visText = document.createElement("div");
            visText.innerText = "Highlight zones";
            visSlider.appendChild(visText);

            let lineSeparator = document.createElement("br");
            visSlider.appendChild(lineSeparator);

            //Range slider input
            let visInput = document.createElement("input");
            visInput.setAttribute("type", "range");
            visInput.setAttribute("id", "visRange");
            visInput.setAttribute("name", "range");
            visInput.setAttribute("min", "0");
            visInput.setAttribute("max", "100");
            visInput.setAttribute("step", "1");
            visInput.value = 0;

            //Range slider label (name)
            let visLabel = document.createElement("label");
            visLabel.innerText = '0'


            visSlider.appendChild(visInput);
            visSlider.appendChild(visLabel);

            var inputEvtHasNeverFired = true;

            var rangeValue = {current: undefined, mostRecent: undefined};

            visInput.addEventListener("input", function (evt) {
                inputEvtHasNeverFired = false;
                rangeValue.current = evt.target.value;
                if (rangeValue.current !== rangeValue.mostRecent) {
                    visInput.value = rangeValue.current;
                    visLabel.innerText = rangeValue.current + '';
                    maskOverlay.style.opacity = (rangeValue.current / 100 * 0.8) + '';
                }
                rangeValue.mostRecent = rangeValue.current;
            });

            let topControls = document.querySelector("mona-lisa-embed").shadowRoot.querySelector(".layout .top-controls");
            insertAfter(visSlider, topControls);
        }

        function initButtons() {
            let checkbox1 = document.createElement('input');
            checkbox1.type = "checkbox";
            checkbox1.name = "Dotted overlay";
            checkbox1.value = "1";
            checkbox1.checked = true;
            checkbox1.id = "showOverlay";

            checkbox1.addEventListener('change', function () {
                dottedOverlay.style.opacity = this.checked ? 1.0 : 0.0;
            });

            let label1 = document.createElement("label");
            label1.for = "Dotted overlay";
            label1.innerHTML = "Dotted overlay";

            let checkbox2 = document.createElement('input');
            checkbox2.type = "checkbox";
            checkbox2.name = "Full design";
            checkbox2.value = "0";
            checkbox2.id = "seeFull";
            checkbox2.style = `margin-left: 20px;`;

            checkbox2.addEventListener('change', function () {
                fullOverlay.style.opacity = this.checked ? 1.0 : 0.0;
            });

            let label2 = document.createElement("label");
            label2.for = "Full design";
            label2.innerHTML = "Full design";

            let refresh = document.createElement('input');
            refresh.type = "button";
            refresh.name = "Refresh template";
            refresh.value = "Refresh template";
            refresh.id = "refresh";
            refresh.style = `margin-left: 20px; width: 150px;`;

            refresh.addEventListener('click', function () {
                lastVersion = new Date().getTime();

                fullOverlay.src = full + "?" + lastVersion;

                updateImages();

                refresh.disabled = true;

                let cooldown = setInterval(function updateTimer() {
                    let diff = lastVersion + 60000 - new Date().getTime();

                    if (diff < 0) {
                        refresh.value = "Refresh template";
                        refresh.disabled = false;
                        clearInterval(cooldown);
                    } else {
                        refresh.value = "Refresh template (" + (Math.floor((diff % (1000 * 60)) / 1000)).toString().padStart(2, '0') + "s)";
                    }

                    return updateTimer;
                }(), 200);
            });

            var box2 = document.createElement('div');
            box2.style = `
                     position: fixed;
                     left: calc(var(--sail) + 16px);
                     right: calc(var(--sair) + 16px);
                     display: flex;
                     flex-flow: row nowrap;
                     align-items: center;
                     justify-content: center;
                     height: 40px;
                     top: calc(var(--sait) + 80px);
                     text-shadow: black 1px 0 10px;
                     text-align:center;`;

            box2.appendChild(checkbox1);
            box2.appendChild(label1);
            box2.appendChild(checkbox2);
            box2.appendChild(label2);
            box2.appendChild(refresh);

            let topControls = document.querySelector("mona-lisa-embed").shadowRoot.querySelector(".layout .top-controls");
            insertAfter(box2, topControls);
        }

        // Add a style to put a hole in the pixel preview (to see the current or desired color)
        const waitForPreview = setInterval(() => {
            const preview = camera.querySelector("mona-lisa-pixel-preview");
            if (preview) {
                clearInterval(waitForPreview);
                const style = document.createElement('style')
                style.innerHTML = '.pixel { clip-path: polygon(-20% -20%, -20% 120%, 37% 120%, 37% 37%, 62% 37%, 62% 62%, 37% 62%, 37% 120%, 120% 120%, 120% -20%); }'
                preview.shadowRoot.appendChild(style);
            }
        }, 100);

        const waitForControls = setInterval(() => {
            const controls = document.querySelector("mona-lisa-embed").shadowRoot.querySelector("mona-lisa-coordinates");
            if (controls) {
                clearInterval(waitForControls);

                initSlider();
                initButtons();
            }
        }, 100);

    }, false);
}
