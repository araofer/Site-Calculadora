function calcularPorcentagem(){
    let valor=document.getElementById("valor").value
    let porcentagem=document.getElementById("porcentagem").value
    let r=(valor*porcentagem)/100
    
    document.getElementById("resultado").innerText="Resultado: "+r
    }
    

function gerarCampos() {
    let pessoas = parseInt(document.getElementById("pessoas").value);
    let container = document.getElementById("camposPessoas");

    container.innerHTML = "";

    if (!pessoas || pessoas <= 0) return;

    for (let i = 1; i <= pessoas; i++) {
        container.innerHTML += `
            <input type="number" class="valores" placeholder="Pessoa ${i} gastou">
            <br><br>
        `;
    }
}

function calcularDivisao() {
  let total = parseFloat(document.getElementById("total").value);
  let valores = document.querySelectorAll(".valores");

  let soma = 0;

  valores.forEach(input => {
    soma += parseFloat(input.value) || 0;
  });

  let resultado = document.getElementById("resultado");

  if (!total || total <= 0) {
    resultado.innerText = "Digite o valor total!";
    return;
  }

  if (valores.length === 0) {
    resultado.innerText = "Clique em 'Dividir valores diferentes' primeiro!";
    return;
  }

  let diferenca = total - soma;

  if (Math.abs(diferenca) < 0.01) {
    resultado.innerText = "Tudo certo! Conta fechou certinho 👍";
  } else if (diferenca > 0) {
    resultado.innerText = "Faltam R$ " + diferenca.toFixed(2);
  } else {
    resultado.innerText = "Passou R$ " + Math.abs(diferenca).toFixed(2);
  }
}

    
function calcularIdade(){
    let nasc=new Date(document.getElementById("nascimento").value)
    let hoje=new Date()
    let idade=hoje.getFullYear()-nasc.getFullYear()
    
    document.getElementById("resultado").innerText="Idade: "+idade
    }
    
function gerarSenha(){
    let chars="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    let senha=""
    
    for(let i=0;i<12;i++){
    senha+=chars.charAt(Math.floor(Math.random()*chars.length))
    }
    
    document.getElementById("resultado").innerText=senha
    }
    
function contarCaracteres(){
    let texto=document.getElementById("texto").value
    
    document.getElementById("resultado").innerText="Caracteres: "+texto.length
    }
    
function calcularIMC(){
    let peso=document.getElementById("peso").value
    let altura=document.getElementById("altura").value
    
    let imc=peso/(altura*altura)
    
    document.getElementById("resultado").innerText="IMC: "+imc.toFixed(2)
    }

function calcularDesconto(){

        let valor = document.getElementById("valor").value;
        
        let desconto = document.getElementById("desconto").value;
        
        let valorDesconto = (valor * desconto) / 100;
        
        let valorFinal = valor - valorDesconto;
        
        document.getElementById("resultado").innerHTML =
        "Desconto: R$ " + valorDesconto.toFixed(2) +
        "<br>Valor final: R$ " + valorFinal.toFixed(2);
        
        }

function calcularJuros(){

    let capital = document.getElementById("capital").value;
            
    let taxa = document.getElementById("taxa").value;
            
    let tempo = document.getElementById("tempo").value;
            
    let juros = (capital * taxa * tempo) / 100;
            
    let total = parseFloat(capital) + juros;
            
    document.getElementById("resultado").innerHTML =
    "Juros: R$ " + juros.toFixed(2) +
    "<br>Total: R$ " + total.toFixed(2);
            
    }

function gerarLinkWhats(){

    let numeroInput = document.getElementById("numero").value;
    let mensagem = document.getElementById("mensagem").value;

    let numero = numeroInput.replace(/\D/g, "");

    let resultado = document.getElementById("resultado");

    if (!numero) {
        resultado.textContent = "Informe um número de WhatsApp válido.";
        return;
    }

    let link = "https://wa.me/" + numero + "?text=" + encodeURIComponent(mensagem);

    resultado.textContent = "";

    let a = document.createElement("a");
    a.href = link;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = link;

    resultado.appendChild(a);

}



function calcularLucro(){

    let custo = document.getElementById("custo").value;
                
    let venda = document.getElementById("venda").value;
                
    let lucro = venda - custo;
                
    let porcentagem = (lucro / custo) * 100;
                
    document.getElementById("resultado").innerHTML =
                "Lucro: R$ " + lucro.toFixed(2) +
                "<br>Margem: " + porcentagem.toFixed(2) + "%";
    }

function calcularCombustivel(){

    let distancia = document.getElementById("distancia").value;

    let consumo = document.getElementById("consumo").value;

    let preco = document.getElementById("preco").value;

    if(!distancia || !consumo || !preco){
    alert("Preencha todos os campos");
    return;
}

    let litros = distancia / consumo;

    let custo = litros * preco;

    document.getElementById("resultado").innerHTML =
    "Você vai gastar <br><br>" +
    litros.toFixed(2) + " litros<br>" +
    "Total: R$ " + custo.toFixed(2);

}

//**Financiamento de Carro **/
// MÁSCARA DE MOEDA (Executada enquanto o usuário digita)
function mascaraMoeda(campo) {
    let valor = campo.value;
    
    // Remove tudo o que não for dígito
    valor = valor.replace(/\D/g, "");
    
    // Permite digitar os centavos corretamente
    valor = (Number(valor) / 100).toFixed(2) + "";
    
    // Substitui o ponto pela vírgula dos centavos
    valor = valor.replace(".", ",");
    
    // Adiciona os pontos dos milhares
    valor = valor.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1.");
    
    // Devolve o valor formatado para o campo
    campo.value = valor;
}

// LIMPA O RESULTADO CASO O USUÁRIO ALTERE OS INPUTS
function limparResultado() {
    let resultadoDiv = document.getElementById("resultadoFinanciamento");
    if (resultadoDiv) {
        resultadoDiv.innerHTML = `<p style="color: #666; text-align: center;">Insira os dados acima e clique em calcular para ver o resultado.</p>`;
    }
}

// LIMPA TODOS OS CAMPOS DO FORMULÁRIO
function limparCampos() {
    document.getElementById("valorVeiculo").value = "";
    document.getElementById("valorEntrada").value = "0";
    document.getElementById("taxaMensal").value = "";
    document.getElementById("prazoMeses").value = "";
    limparResultado();
}

// MOTOR DE CÁLCULO PRINCIPAL (FINANCIAMENTO DE CARRO - PRICE)
function calcularFinanciamento() {
    // Captura dos elementos
    let elVeiculo = document.getElementById("valorVeiculo");
    let elEntrada = document.getElementById("valorEntrada");
    let elTaxa = document.getElementById("taxaMensal");
    let elPrazo = document.getElementById("prazoMeses");
    let resultadoDiv = document.getElementById("resultadoFinanciamento");

    // Verifica se os elementos existem na tela antes de ler os valores
    if (!elVeiculo || !elTaxa || !elPrazo || !resultadoDiv) {
        console.error("Erro: Um ou mais IDs não foram encontrados no HTML.");
        return;
    }

    let campoVeiculo = elVeiculo.value;
    let campoEntrada = elEntrada ? elEntrada.value : "";
    let taxaMensalInput = elTaxa.value;
    let prazoMesesInput = elPrazo.value;

    // Validação de campos obrigatórios
    if (!campoVeiculo || !taxaMensalInput || !prazoMesesInput) {
        alert("Por favor, preencha todos os campos obrigatórios.");
        return;
    }

    // Tratamento seguro dos dados
    let valorVeiculo = Number(campoVeiculo.replace(/\./g, "").replace(",", "."));
    let valorEntrada = campoEntrada ? Number(campoEntrada.replace(/\./g, "").replace(",", ".")) : 0;
    
    // Limpa a taxa de juros (aceita vírgula ou ponto)
    let taxaTratada = taxaMensalInput.replace(/\./g, "").replace(",", ".");
    let taxaMensal = parseFloat(taxaTratada) / 100;
    let prazoMeses = parseInt(prazoMesesInput);

    // Validação contra NaN (Not a Number)
    if (isNaN(valorVeiculo) || isNaN(taxaMensal) || isNaN(prazoMeses)) {
        alert("Por favor, insira números válidos.");
        return;
    }

    // Regras de negócio
    let valorFinanciado = valorVeiculo - valorEntrada;
    
    if (valorFinanciado <= 0) {
        alert("O valor da entrada não pode ser maior ou igual ao valor do veículo.");
        return;
    }

    if (taxaMensal <= 0 || prazoMeses <= 0) {
        alert("A taxa de juros e o prazo devem ser maiores que zero.");
        return;
    }

    // Cálculo da prestação mensal (Fórmula Price)
    let parcela = (valorFinanciado * taxaMensal) / (1 - Math.pow(1 + taxaMensal, -prazoMeses));
    let totalFinanciamento = parcela * prazoMeses;
    let totalJuros = totalFinanciamento - valorFinanciado;
    let custoTotalVeiculo = totalFinanciamento + valorEntrada;

    // Injeta a estrutura de resultado tratada
    resultadoDiv.innerHTML = `
        <div class="resultado-wrapper">
            <div class="resultado-item principal">
                <span>Valor a Financiar:</span>
                <strong>R$ ${valorFinanciado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
            </div>
            
            <div class="resultado-destaque">
                <span>Parcela Mensal (${prazoMeses}x):</span>
                <h2>R$ ${parcela.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
            </div>
            
            <div class="resultado-grid-detalhes">
                <div class="resultado-item">
                    <span>Total dos Juros:</span>
                    <span style="color: #c62828; font-weight: bold;">R$ ${totalJuros.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div class="resultado-item">
                    <span>Total do Financiamento:</span>
                    <strong>R$ ${totalFinanciamento.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                </div>
                <div class="resultado-item">
                    <span>Custo Total do Veículo (com entrada):</span>
                    <strong>R$ ${custoTotalVeiculo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                </div>
            </div>
        </div>
    `;
}