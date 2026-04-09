const fs = require('fs');
const path = 'src/components/ReportWidget.astro';
let content = fs.readFileSync(path, 'utf8');

const oldSubmit = `    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const formData = new FormData(form);
      const tipo = formData.get('tipo');
      const ruta = formData.get('ruta') || '';
      const descripcion = formData.get('descripcion') || '';
      const lat = formData.get('lat') || '';
      const lng = formData.get('lng') || '';

      if (!tipo) { showFeedback('Selecciona el tipo de problema.', 'error'); return; }
      if (!descripcion || descripcion.toString().trim().length < 10) {
        showFeedback('La descripción es muy corta, agrega más detalle.', 'error');
        return;
      }

      setSubmitting(true);
      if (feedback) feedback.hidden = true;

      try {
        const res = await fetch('/api/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo,
            ruta,
            descripcion,
            lat,
            lng,
            repoOwner,
            repoName,
            userAgent: navigator.userAgent,
            url: window.location.href
          }),
        });

        if (res.ok) {
          const data = await res.json();
          showFeedback(\`¡Gracias! Reporte enviado (#\${data.number})\`, 'success');
          setTimeout(closeModal, 2800);
        } else {
          const errData = await res.json().catch(() => ({}));
          console.error('[ReportWidget] API error:', res.status, errData);
          showFeedback(
            errData.error || \`Error al enviar (\${res.status}).\`,
            'error'
          );
          setSubmitting(false);
        }
      } catch (err) {
        console.error('[ReportWidget] Network error:', err);
        showFeedback('Sin conexión. Intenta de nuevo.', 'error');
        setSubmitting(false);
      }
    });`;

const newSubmit = `    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const formData = new FormData(form);
      const tipo = formData.get('tipo');
      const ruta = formData.get('ruta') || '';
      const descripcion = formData.get('descripcion') || '';
      const lat = formData.get('lat') || '';
      const lng = formData.get('lng') || '';

      if (!tipo) { showFeedback('Selecciona el tipo de problema.', 'error'); return; }
      if (!descripcion || descripcion.toString().trim().length < 10) {
        showFeedback('La descripción es muy corta, agrega más detalle.', 'error');
        return;
      }

      setSubmitting(true);
      if (feedback) feedback.hidden = true;

      if (!githubToken) {
        console.error('[ReportWidget] GITHUB_ISSUES_TOKEN is not configured.');
        showFeedback('Error de configuración (Token ausente).', 'error');
        setSubmitting(false);
        return;
      }

      const body = buildIssueBody({
        tipo,
        ruta,
        descripcion,
        lat,
        lng,
        userAgent: navigator.userAgent,
        url: window.location.href
      });

      const issuePayload = {
        title: \`[REPORTE] \${TIPO_TITLES[tipo] ?? tipo}\${ruta ? \` — \${ruta}\` : ''}\`,
        body,
        labels: TIPO_LABELS[tipo] ?? ['reporte', 'estado:pendiente'],
      };

      try {
        const res = await fetch(
          \`https://api.github.com/repos/\${repoOwner}/\${repoName}/issues\`,
          {
            method: 'POST',
            headers: {
              'Accept':               'application/vnd.github+json',
              'Authorization':        \`Bearer \${githubToken}\`,
              'X-GitHub-Api-Version': '2022-11-28',
              'Content-Type':         'application/json',
              'User-Agent':           'MueveCancun-Report-Widget',
            },
            body: JSON.stringify(issuePayload),
          }
        );

        if (res.ok) {
          const data = await res.json();
          showFeedback(\`¡Gracias! Reporte enviado (#\${data.number})\`, 'success');
          setTimeout(closeModal, 2800);
        } else {
          const errData = await res.json().catch(() => ({}));
          console.error('[ReportWidget] GitHub API error:', res.status, errData);
          showFeedback(
            \`Error al enviar (\${res.status}).\`,
            'error'
          );
          setSubmitting(false);
        }
      } catch (err) {
        console.error('[ReportWidget] Network error:', err);
        showFeedback('Sin conexión. Intenta de nuevo.', 'error');
        setSubmitting(false);
      }
    });`;

content = content.replace(oldSubmit, newSubmit);
fs.writeFileSync(path, content);
