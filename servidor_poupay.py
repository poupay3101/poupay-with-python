from flask import Flask, request, jsonify, send_from_directory
from google.colab.output import eval_js
import threading
import time
import os

# Definir a pasta pública onde está o index.html
PUBLIC = "public"

# Criar uma nova instância do servidor
app2 = Flask("PouPay_Novo")

# Página inicial
@app2.route("/")
def inicio_novo():
    return send_from_directory(PUBLIC, "index.html")

# Arquivos CSS, JS e imagens
@app2.route("/<path:caminho>")
def arquivos_novos(caminho):
    return send_from_directory(PUBLIC, caminho)

# Chat com Bernard
@app2.route("/api/chat", methods=["POST"])
def conversar_novo():
    dados = request.get_json(silent=True) or {}
    mensagem = dados.get("message", "")

    if not isinstance(mensagem, str) or not mensagem.strip():
        return jsonify({"error": "Digite uma mensagem."}), 400

    try:
        mensagens = [
            {"role": "system", "content": "Você é Bernard, assistente financeiro do PouPay."},
            {"role": "user", "content": mensagem.strip()}
        ]

        # Exemplo de chamada que o usuário utiliza no ambiente Colab/Python
        # (caso utilize uma função ia() definida no seu ambiente)
        resposta = "Oink! Recebi sua mensagem com sucesso no servidor Python do PouPay! 🐷"

        return jsonify({"reply": resposta})

    except Exception as erro:
        print("Erro no Bernard:", repr(erro))
        return jsonify({"error": "Erro ao gerar resposta."}), 500

# Iniciar na porta nova
def servidor_novo():
    app2.run(
        host="0.0.0.0",
        port=5001,
        debug=False,
        use_reloader=False
    )

threading.Thread(target=servidor_novo, daemon=True).start()

time.sleep(3)

import requests
try:
    teste = requests.get("http://127.0.0.1:5001/", timeout=15)
    print("Teste da página:", teste.status_code)
    print("HTML encontrado:", "html" in teste.text.lower())
except Exception as e:
    print("Aviso no teste local:", e)

# Criar endereço público
try:
    ENDERECO_POUPAY = eval_js("google.colab.kernel.proxyPort(5001)")
    print("\n🐷 NOVO POUPAY:")
    print(ENDERECO_POUPAY)
except Exception as e:
    print("Executando fora do Colab ou proxy não disponível diretamente.")

from google.colab import output
output.serve_kernel_port_as_iframe(5001, height=800)
