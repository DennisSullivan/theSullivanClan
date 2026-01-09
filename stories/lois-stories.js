// lois-stories.js
// Master list of Lois's stories: titles + Google Doc URLs

const loisStories = {
    1: { 
        title: "A Mother's Day Message",
        url: "https://docs.google.com/document/d/e/2PACX-1vQ_Q7QWncVuRvsjQDqN_0kYwe4rcXS9Lw2WVYMP7XoO4h6Uw87aOKXu9hbIlZZV8Or8VxeLZab-QN7V/pub?embedded=true"
    },
    2: { 
        title: "Cats Eyes",
        url: "https://docs.google.com/document/d/e/2PACX-1vR7jS8v13SyEDMFl5Cs7S2tHzxSE7CP09phECfvBFtfb-L7S8xGQTltH_oWOzureJi3R_yQYO9GPb1Q/pub?embedded=true"
    },
    3: { 
        title: "Corrugated Tin",
        url: "https://docs.google.com/document/d/e/2PACX-1vRMtTi_grECewC9Zi2IbG54B3OrlW5a4AozThZ5G-A4xKDv7EKhhg6RPWkfUV_MmKNDx8jw3Sw4_nF0/pub?embedded=true"
    },
    4: { 
        title: "Creating My World",
        url: "https://docs.google.com/document/d/e/2PACX-1vR4_2JHc2uV-pggWbquFwWSSWyB9LbTTsI1FuYC3BEiFkB9lP0tTJ7iwX1IhOpsHnfzPPehG3ozR8hu/pub?embedded=true"
    },
    5: { 
        title: "Letter to a 21st Century Great Grandchild",
        url: "https://docs.google.com/document/d/e/2PACX-1vQX5YVv0qPuLf8C0EHPtZGMIuhNrsKOmfWZWzav3sDVjpnXDwek0JUYh2pbnUCJoGLhx65KsWjlguOr/pub?embedded=true"
    },
    6: { 
        title: "Faith and Love",
        url: "https://docs.google.com/document/d/e/2PACX-1vSMi9ARnIyJ9R2rE9Ygf6vlx5ijA5Uw1hWdWB67xPMwTsWuOp9-2tiJOD40MCKShCCQSq0JlKz-kd71/pub?embedded=true"
    },
    7: { 
        title: "My Crystal Cave",
        url: "https://docs.google.com/document/d/e/2PACX-1vQQtFE3aQTKQuOsNlN_QW00gcLVwAwU9Ihvai0Uuz2An41fDtWT53I3svSleo_v-ceGxL76FWKNVPjC/pub?embedded=true"
    },

    // placeholders for the remaining stories
    8:  { 
        title: "Self-Discipline",  
        url: "https://docs.google.com/document/d/e/2PACX-1vRDm_iemQk9aNMcHuc7bpgjRo4k-Rti_xd2DnXdKBqIVOYako3xTAxHg1i5zzRredhwf3GNYM5b88qa/pub?embedded=true" 
    },
    9:  { 
        title: "Lois's Mother of the Year Speach",  
        url: "https://docs.google.com/document/d/e/2PACX-1vTMln1bR1DjDeimqK76UCQeOeHe_ERjLSwmF3RdTjkw0R6q3ptRIw-LnZv4Mw4RctYI8_SDE8Wvo-Kh/pub?embedded=true" 
    },
    10: { 
        title: "Story 10", 
        url: "https://docs.google.com/document/d/e/2PACX-1vQs1YGP7qE3X6R-eukDgAWLv2oI9tT3aHgtaleqdXaYVUdDJtFX1Hcm0pVtwagXCrfF6Sq0yHRt057-/pub?embedded=true" 
    },
    11: { 
        title: "My Wedding Dress", 
        url: "https://docs.google.com/document/d/e/2PACX-1vQs1YGP7qE3X6R-eukDgAWLv2oI9tT3aHgtaleqdXaYVUdDJtFX1Hcm0pVtwagXCrfF6Sq0yHRt057-/pub?embedded=true" 
    },
    12: { 
        title: "Reflections in a Baby's Eye", 
        url: "https://docs.google.com/document/d/e/2PACX-1vT-GnV8Wu6IBmTzM1K972APcZMCgVGJHUwLs3A8FJhikZZ6RyqCE0rjRQfh9QEZyeBhEaPwwcCWqHfb/pub?embedded=true" 
    },
    13: {
        title: "The \"S\" Book", 
        url: "https://docs.google.com/document/d/e/2PACX-1vSD8qbHSQ2V_lO4ue_RpCziDW2ERyO5ToYtGe7uYCGEMD-xFWE5krU3iaexKuSJk6jZ0nDev2fnalGv/pub?embedded=true" 
    },
    14: {
        title: "The Brothers",
        url: "https://docs.google.com/document/d/e/2PACX-1vSN62CvbrGnqASQHsfeSbhiVwLP6KmMro1WFCR7mtwUGfqdLVLWDM9db3CAvUoYnZGKtkXN_gVAyoDv/pub?embedded=true"
    },
    15: { 
        title: "The Mixed Bouquet Family",
        url: "https://docs.google.com/document/d/e/2PACX-1vTCyGRYrZR21B2bworb66X1jQCdJEsvf72amNTP1wkdzNlMyLMM538tYUMbN0sbVne52N_V_ov7SDMG/pub?embedded=true" 
    },
    16: { 
        title: "The Story of Rebecca ", 
        url: "https://docs.google.com/document/d/e/2PACX-1vT-lN32GOYOh6mm7bjvAZIv05KQKHDyDr7Dj5Fj1wcrnHkoH9-jhrVGzehhtGxXwD-gxkIMo9I5ou0F/pub?embedded=true" 
    }
};

// Expose the story list to any page that loads this file
function getLoisStories() {
    return loisStories;
}
