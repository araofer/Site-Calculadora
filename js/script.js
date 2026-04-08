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

        let numero = document.getElementById("numero").value;
        
        let mensagem = document.getElementById("mensagem").value;
        
        let mensagemCodificada = encodeURIComponent(mensagem);
        
        let link = "https://wa.me/" + numero + "?text=" + mensagemCodificada;
        
        document.getElementById("resultado").innerHTML =
        '<a href="' + link + '" target="_blank">' + link + '</a>';
        
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