const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {

    console.log("Iniciando Seed...");

    const empresaExistente = await prisma.empresa.findFirst({
        where: {
            cnpj: "00.000.000/0001-00"
        }
    });

    let empresa;

    if (empresaExistente) {

        empresa = empresaExistente;

    } else {

        empresa = await prisma.empresa.create({

            data: {

                razaoSocial: "Empresa Teste",

                nomeFantasia: "ERP Elizeu",

                cnpj: "00.000.000/0001-00",

                email: "contato@empresa.com",

                telefone: "(19)99999-9999"

            }

        });

    }

    const usuarioExistente = await prisma.usuario.findUnique({

        where: {

            email: "admin@admin.com"

        }

    });

    if (!usuarioExistente) {

        const senha = await bcrypt.hash("123456", 10);

        await prisma.usuario.create({

            data: {

                empresaId: empresa.id,

                nome: "Administrador",

                email: "admin@admin.com",

                senha,

                perfil: "ADMIN",

                ativo: true

            }

        });

    }

    console.log("Seed executada com sucesso.");

}

main()
    .catch(console.error)
    .finally(async () => {

        await prisma.$disconnect();

    });