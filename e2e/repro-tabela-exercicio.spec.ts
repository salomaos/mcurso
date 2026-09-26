import { test, expect } from "@playwright/test";

const SENHA = process.env.APP_MASTER_PASSWORD ?? "mestradee2e";

test("repro: cliques +Linha/+Coluna/+Alternativa e digitar celula/alternativa mantem?", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Senha mestra").fill(SENHA);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("heading", { name: "Apostilas", level: 1 })).toBeVisible();

  const titulo = "Repro 3e4 " + Date.now();
  await page.goto("/apostilas/nova");
  await page.getByLabel("Titulo").fill(titulo);
  await page.getByRole("button", { name: "Criar" }).click();
  await expect(page).toHaveURL(/\/apostilas\/\d+/);
  await page.getByPlaceholder("Titulo da aula").fill("Aula repro");
  await page.getByRole("button", { name: "Criar e editar" }).click();
  await expect(page).toHaveURL(/\/editar/);

  // -------- BUG 3: TABELA --------
  await page.locator("select").last().selectOption({ label: "Tabela" });
  await page.getByRole("button", { name: "Adicionar bloco" }).click();
  await expect(page.getByRole("button", { name: "+ Linha" })).toBeVisible();
  await page.getByRole("button", { name: "+ Linha" }).click();
  const trs = await page.locator("tbody tr").count();
  console.log("TABELA tbody tr apos +Linha =", trsindustriais);
  await page.getByRole("button", { name: "+ Coluna" }).click();
  const celula = page.locator("tbody input").first();
  await celula.fill("A1");
  await expect(celula).toHaveValue("A1");

  // -------- BUG 4: EXERCICIO --------
  await page.locator("select").last().selectOption({ label: "Exercicio" });
  await page.getByRole("button", { name: "Adicionar bloco" }).click();
  await page.getByRole("button", { name: "+ Alternativa" }).click();
  const alts = page.locator("input[placeholder^=Alternativa]");
  const nAlt = await alts.count();
  console.log("EXERCICIO n alternativas apos +Alternativa =", nAlt);
  await alts.last().fill("Texto B");
  await expect(alts.last()).toHaveValue("Texto B");

  await page.getByRole("button", { name: "Salvar aula" }).click();
  await expect(page).toHaveURL(/\/aulas\/\d+$/);
  await page.waitForTimeout(400);
  console.log("FINAL URL " + page.url());
});
