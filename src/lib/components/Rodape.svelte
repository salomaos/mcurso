<script lang="ts">
  // Rodapé básico: nome do app + ano. Aluno e professor veem o mesmo. Some na
  // impressão (`no-print`) e nas telas cheias de apresentação (ver layout).
  const ano = new Date().getFullYear();
</script>

<footer
  class="footer border-t-2 border-base-300 p-4 text-sm no-print"
>
  <div class="container max-w-5xl flex items-center justify-between flex-row">
    <p class="opacity-70 m-0">mcurso</p>
    <p class="opacity-70">© {ano}</p>
  </div>
</footer>
