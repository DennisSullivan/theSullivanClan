// letters-mexico.js
// Returns an array of letter objects sorted by date

function getLettersFromMexico() {
    return [
        {
            date: "1987-01-18",
            url: "https://docs.google.com/document/d/e/2PACX-1vRtYV6MosCSy84BVV7Stmd7GKKYw09EkpQYGy61MLYp7Hw_-l7DdvV98UjSburqs1yPory-Z4FhlAVK/preview"
        },
        {
            date: "1991-12-26",
            url: "https://docs.google.com/document/d/e/2PACX-1vRhFK1aXrzhopNGNk7LTvEJq_-uEmPQKogtQCyU2MET831wJv4h1IQwJQT87mnXch2QfVPz3lY-55fz/preview"
        },
        {
            date: "1991-12-26B",
            url: "https://docs.google.com/document/d/e/2PACX-1vQGapTx_ySNAV4z-F44sGlGcUV4JF-OoekOXHDFj_bXVbHtorpS_0mdmsNp05gapV79XVebD_ur2Dzb/preview"
        }
        // Add more letters here
    ].sort((a, b) => new Date(a.date) - new Date(b.date));
}
