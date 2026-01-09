// lois-stories.js
// Master list of Lois's stories: titles + Google Doc URLs

const loisStories = {
    1: { 
        title: "Story 1",
        url: "https://docs.google.com/document/d/e/2PACX-1vQ_Q7QWncVuRvsjQDqN_0kYwe4rcXS9Lw2WVYMP7XoO4h6Uw87aOKXu9hbIlZZV8Or8VxeLZab-QN7V/pub?embedded=true"
    },
    2: { 
        title: "Story 2",
        url: "https://docs.google.com/document/d/e/2PACX-1vR7jS8v13SyEDMFl5Cs7S2tHzxSE7CP09phECfvBFtfb-L7S8xGQTltH_oWOzureJi3R_yQYO9GPb1Q/pub?embedded=true"
    },
    3: { 
        title: "Story 3",
        url: "https://docs.google.com/document/d/e/2PACX-1vRMtTi_grECewC9Zi2IbG54B3OrlW5a4AozThZ5G-A4xKDv7EKhhg6RPWkfUV_MmKNDx8jw3Sw4_nF0/pub?embedded=true"
    },
    4: { 
        title: "Story 4",
        url: "https://docs.google.com/document/d/e/2PACX-1vR4_2JHc2uV-pggWbquFwWSSWyB9LbTTsI1FuYC3BEiFkB9lP0tTJ7iwX1IhOpsHnfzPPehG3ozR8hu/pub?embedded=true"
    },
    5: { 
        title: "Story 5",
        url: "https://docs.google.com/document/d/e/2PACX-1vQX5YVv0qPuLf8C0EHPtZGMIuhNrsKOmfWZWzav3sDVjpnXDwek0JUYh2pbnUCJoGLhx65KsWjlguOr/pub?embedded=true"
    },
    6: { 
        title: "Story 6",
        url: "https://docs.google.com/document/d/e/2PACX-1vSMi9ARnIyJ9R2rE9Ygf6vlx5ijA5Uw1hWdWB67xPMwTsWuOp9-2tiJOD40MCKShCCQSq0JlKz-kd71/pub?embedded=true"
    },
    7: { 
        title: "Story 7",
        url: "https://docs.google.com/document/d/e/2PACX-1vQQtFE3aQTKQuOsNlN_QW00gcLVwAwU9Ihvai0Uuz2An41fDtWT53I3svSleo_v-ceGxL76FWKNVPjC/pub?embedded=true"
    },

    // placeholders for the remaining stories
    8:  { title: "Story 8",  url: "" },
    9:  { title: "Story 9",  url: "" },
    10: { title: "Story 10", url: "" },
    11: { title: "Story 11", url: "" },
    12: { title: "Story 12", url: "" },
    13: { title: "Story 13", url: "" },
    14: { title: "Story 14", url: "" },
    15: { title: "Story 15", url: "" },
    16: { title: "Story 16", url: "" }
};

// Expose the story list to any page that loads this file
function getLoisStories() {
    return loisStories;
}
