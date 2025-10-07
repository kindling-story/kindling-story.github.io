window.onload = async function(){
    const items = document.querySelectorAll("#artifact-list [js-href]");
    for(const item of items) {
        item.addEventListener("click", () => window.location=item.getAttribute("js-href"));
    }   
}