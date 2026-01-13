// dear-beautiful-girls.js
// Clean, sorted list of Dear Beautiful Girls Google Docs only

const dearBeautifulGirls = [
  // 1977
  { date: "February 1, 1977", url: "https://docs.google.com/document/d/1cUJuy74pUZJ55t9WFkgmH6-gbq3Ryb83fgC8TXwPfwk/preview" },
  { date: "March 15, 1977",    url: "https://docs.google.com/document/d/16Tacx39jWRjT6f8HqTAABVhhiD2kKl-zSleNF-K3DCo/preview" },
  { date: "March 27, 1977",    url: "https://docs.google.com/document/d/1QTa1pUAVe662UiCeNKbXx6axywtwvaXc_3gLi8eE5Jg/preview" },
  { date: "April 20, 1977",    url: "https://docs.google.com/document/d/1C2rWzTbXzaznv_YrIzFQKghzZzjUd1tEwMH09katb30/preview" },
  { date: "May 3, 1977",       url: "https://docs.google.com/document/d/1czTqM60A25OcLWkfs0E5oTMUu0q9ckgMYpT37OjhK0I/preview" },
  { date: "May 13, 1977",      url: "https://docs.google.com/document/d/15jUHP3ZTlzxzekdBTf79ct0KqDGU2ZxfM4dKtFY0Loc/preview" },
  { date: "May 20, 1977",      url: "https://docs.google.com/document/d/1tj6DGz9cvNB85WeP46EfdDNXXkWfdWBxrW4z0kxYJfM/preview" },
  { date: "June 13, 1977",     url: "https://docs.google.com/document/d/1MGQ7sHyelMs0x2_wZIDqQEnbJQLG48vCgiBLLKBG3V8/preview" },
  { date: "June 22, 1977",     url: "https://docs.google.com/document/d/1-xQ5KiwZyIbSGuF4Fo3qiUwwLvqBLCjo1qhz1qE7SJM/preview" },
  { date: "July 1, 1977",      url: "https://docs.google.com/document/d/1VNYZ__wng_MgESIIYwY3ww9vbSzq9yy0N7R0otYUGCM/preview" },
  { date: "July 27, 1977",     url: "https://docs.google.com/document/d/1G7MJuqqjKJlpsb8H8nlcPLGKT36ANKdUrG-lmMJaTd4/preview" },
  { date: "August 9, 1977",    url: "https://docs.google.com/document/d/1pH9sLbmghlTy1wOCinpwk1Xmvzv6dK-FADOdKDD1L8g/preview" },
  { date: "September 20, 1977",url: "https://docs.google.com/document/d/1jnxRK1idNuJt6zZyvXcl6OVmFZwdqEYxp8yC9qs-yA0/preview" },
  { date: "September 27, 1977",url: "https://docs.google.com/document/d/10PBLfEYxDuT2LYHIZ8v46nZhr_K2a9zZY5BE-2PvW4Y/preview" },
  { date: "November 15, 1977", url: "https://docs.google.com/document/d/1x4irK8rzr9IHWCGyvZiGxY3iBhLPZJInFhkM09fuUlc/preview" },

  // 1978
  { date: "January 17, 1978",  url: "https://docs.google.com/document/d/1VSleNftumfTW8_YijPkRf5uRKw0kpnOL7zlxDIn7dQk/preview" },
  { date: "January 26, 1978",  url: "https://docs.google.com/document/d/16H8yBheivSlXUsh0XSvQQ0fjKZMSRyRrFpYpDGJnP-c/preview" },
  { date: "February 7, 1978",  url: "https://docs.google.com/document/d/16OpQEg7KXLCTZDqnWhvIyjjiujlWVeZokaAbra8Tt98/preview" },
  { date: "February 28, 1978", url: "https://docs.google.com/document/d/121sZZjlEpXriJec-w7PCnATq7d8ta6MHlo6TuMTfP5E/preview" },
  { date: "March 7, 1978",     url: "https://docs.google.com/document/d/1LON4_nCFEMQ1Lx-9ZsN54HWlaB5qP-Z367Xi76oIEUE/preview" },
  { date: "April 13, 1978",    url: "https://docs.google.com/document/d/15xlWnS3HLPvwyNbXJqNn2G0qeYOudTLxR9xNR_bISnc/preview" },
  { date: "May 4, 1978",       url: "https://docs.google.com/document/d/1DKjfWN1ktgA2ugSbttEAF1f9g2fCjSjvGjp6oNltZ3Q/preview" },
  { date: "June 20, 1978",     url: "https://docs.google.com/document/d/13zrwJ1IdJBQvDBiipQMrZopB0ukY2bkdsNX9EKj_l1g/preview" },
  { date: "June 26, 1978",     url: "https://docs.google.com/document/d/1Ia3uThAjcVOT_0bS0uzNe-dhGoJFg2GiGD54fHYupis/preview" },
  { date: "July 10, 1978",     url: "https://docs.google.com/document/d/124VcyuxsFL06rA7O2qq_kGhplCBPDvJt5bNrDSPE2zI/preview" },
  { date: "July 17, 1978",     url: "https://docs.google.com/document/d/1TdFZWZLn78c_qK_QnZ8t5iw4hkl5DOahydHxyou3NuM/preview" },
  { date: "July 25, 1978",     url: "https://docs.google.com/document/d/1jnpFE1SS5jTlLUNlLnfavdhilhyGf6MAUCrwnYSMaM0/preview" },
  { date: "August 15, 1978",   url: "https://docs.google.com/document/d/1rHTukf_SapzPis7seWWuKk3HomZxRcf9r0Aer7zaU2U/preview" },

  // 1979
  { date: "April 27, 1979",    url: "https://docs.google.com/document/d/1XqB-bXLjdplJa7ro6ESreHeNnwgJ4H4GUtdGwrbjPpk/preview" },
  { date: "June 12, 1979",     url: "https://docs.google.com/document/d/1bzb0eLE1K0JOYH0Yrca9f6o_maldcBjBcNCUbq1IhM8/preview" },
  { date: "July 11, 1979",     url: "https://docs.google.com/document/d/1F_XcSwA2hdFJ5uOcbgwGc7oRU4Y8u1lv9acENB-48IQ/preview" },
  { date: "September 19, 1979",url: "https://docs.google.com/document/d/1sHDTxU7aybGf90jMrYypfAlQMrumnhBEBhw7kS7Hs7g/preview" },
  { date: "November 13, 1979", url: "https://docs.google.com/document/d/1SWjyti5vjN7j1nfLZRwvjllf-LqGokd5XE6D_unov6M/preview" },

  // 1981
  { date: "September 24, 1981",url: "https://docs.google.com/document/d/1dYT6F079ZpqshrgSpQGU-a7nBEp3vVDdRXrZU38v5PQ/preview" },

  // 1985
  { date: "January 9, 1985",   url: "https://docs.google.com/document/d/1Nh0k01k4PIN0tB0y8rRv5ARkasF1RBKByqKwyMNr5GA/preview" },

  // 1986
  { date: "December 9, 1986",  url: "https://docs.google.com/document/d/1xSZEO1o-lrlXFvmErjgkhA30G_bDbgtiNCqg0UzPhfM/preview" }
];

function getDearBeautifulGirls() {
  return dearBeautifulGirls;
}
