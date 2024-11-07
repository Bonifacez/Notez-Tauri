from openai import OpenAI

url = "http://localhost:11434/v1"
api_key = "ollama"
model = "llama3.1:8b"
emb_url = "http://localhost:11434/v1"
emb_api_key = "ollama"
emb_model = "mxbai-embed-large:latest"

complete_client = OpenAI(api_key=api_key, base_url=url)
emb_client = OpenAI(api_key=emb_api_key, base_url=emb_url, timeout=20)


def get_complete_client(new_url, new_api_key, new_model):
    global url, api_key, model, complete_client
    if new_url != url or new_api_key != api_key or new_model != model:
        url = new_url
        api_key = new_api_key
        model = new_model
        complete_client = OpenAI(api_key=api_key, base_url=url)
    return complete_client


def get_emb_client(new_url, new_api_key, new_model):
    global emb_url, emb_api_key, emb_model, emb_client
    if new_url != emb_url or new_api_key != emb_api_key or new_model != emb_model:
        emb_url = new_url
        emb_api_key = new_api_key
        emb_model = new_model
        emb_client = OpenAI(api_key=emb_api_key, base_url=emb_url, timeout=20)
    return emb_client



