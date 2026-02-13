function goToLearn(topic) {
  localStorage.setItem("selectedTopic", topic);
  window.location.href = "/learn.html";
}
