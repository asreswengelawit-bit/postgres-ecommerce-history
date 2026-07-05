document.addEventListener('DOMContentLoaded', () => {
  if (typeof ORDER_ITEM_ID !== 'undefined') {
    loadTrackingData(ORDER_ITEM_ID);
  }
});

async function loadTrackingData(itemId) {
  const logsContainer = document.getElementById('tracking-logs');
  
  try {
    const data = await apiFetch(`/orders/item/${itemId}/tracking`);
    const logs = data.tracking;

    if (logs.length === 0) {
      logsContainer.innerHTML = `<p style="text-align: center; color: var(--text-secondary);">No tracking status log updates available.</p>`;
      return;
    }

    // Set header info
    document.getElementById('track-product-name').textContent = logs[0].product_name;
    document.getElementById('track-item-info').textContent = `NexusCart order item tracking reference: #ITEM-${itemId}`;

    const currentStatus = logs[0].current_status; // e.g. Pending, Processing, Shipped, Delivered, Cancelled
    updateVisualProgress(currentStatus);

    // Render detailed timeline events list
    logsContainer.innerHTML = logs.map(event => {
      const eventTime = new Date(event.created_at).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });

      return `
        <div class="timeline-event active">
          <div class="timeline-dot"></div>
          <div class="timeline-content">
            <div class="timeline-title">${event.status}</div>
            <div class="timeline-time">${eventTime}</div>
            <div class="timeline-desc">${event.description || ''}</div>
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('Error fetching tracking data:', err);
    logsContainer.innerHTML = `
      <div style="text-align: center; color: var(--error); padding: 20px;">
        <i class="fa-solid fa-circle-exclamation" style="font-size: 2rem; margin-bottom: 12px;"></i>
        <p>Could not fetch tracking logs: ${err.message}</p>
      </div>
    `;
  }
}

function updateVisualProgress(status) {
  const steps = ['placed', 'processing', 'shipped', 'delivered'];
  let activeIndex = -1;

  if (status === 'Pending') activeIndex = 0;
  else if (status === 'Processing') activeIndex = 1;
  else if (status === 'Shipped') activeIndex = 2;
  else if (status === 'Delivered') activeIndex = 3;
  else if (status === 'Cancelled') {
    // If cancelled, color everything warning/error
    document.getElementById('visual-progress-bar').style.background = 'var(--error)';
    document.getElementById('visual-progress-bar').style.width = '100%';
    steps.forEach(stepId => {
      const stepCircle = document.querySelector(`#step-${stepId} .step-circle`);
      const stepLabel = document.querySelector(`#step-${stepId} .step-label`);
      if (stepCircle) {
        stepCircle.style.borderColor = 'var(--error)';
        stepCircle.style.color = '#fff';
        stepCircle.style.background = 'rgba(239, 68, 68, 0.2)';
      }
      if (stepLabel) {
        stepLabel.style.color = 'var(--error)';
        stepLabel.textContent = stepId === 'delivered' ? 'Cancelled' : stepLabel.textContent;
      }
    });
    return;
  }

  // Set line width
  const progressBar = document.getElementById('visual-progress-bar');
  if (progressBar) {
    const widthPercentage = (activeIndex / (steps.length - 1)) * 100;
    progressBar.style.width = `${widthPercentage}%`;
  }

  // Highlight step circles & labels
  steps.forEach((stepId, index) => {
    const stepCircle = document.querySelector(`#step-${stepId} .step-circle`);
    const stepLabel = document.querySelector(`#step-${stepId} .step-label`);

    if (index <= activeIndex) {
      // Completed or active step
      if (stepCircle) {
        stepCircle.style.borderColor = 'var(--secondary)';
        stepCircle.style.background = 'linear-gradient(135deg, var(--secondary), #0e7490)';
        stepCircle.style.color = '#fff';
        stepCircle.style.boxShadow = '0 0 15px var(--secondary-glow)';
      }
      if (stepLabel) {
        stepLabel.style.color = 'var(--text-primary)';
        stepLabel.style.fontWeight = '600';
      }
    } else {
      // Future step
      if (stepCircle) {
        stepCircle.style.borderColor = 'var(--glass-border)';
        stepCircle.style.background = 'var(--bg-secondary)';
        stepCircle.style.color = 'var(--text-muted)';
        stepCircle.style.boxShadow = 'none';
      }
      if (stepLabel) {
        stepLabel.style.color = 'var(--text-muted)';
        stepLabel.style.fontWeight = '500';
      }
    }
  });
}
