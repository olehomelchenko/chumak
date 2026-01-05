/**
 * Export Handlers Module
 *
 * Handles all data export functionality (CSV, JSON, workflow, clipboard)
 *
 * Dependencies:
 * - Papa Parse (global window.Papa)
 * - Navigator clipboard API
 */

/**
 * Create export handler methods for Alpine component
 * @returns {Object} Export handler methods
 */
export function createExportHandlers() {
  return {
    /**
     * Export current data as CSV file
     */
    exportCSV() {
      if (!this.currentData || this.currentData.length === 0) {
        alert('No data to export');
        return;
      }

      const start = performance.now();
      try {
        // Convert current data to CSV using PapaParse
        const csv = Papa.unparse(this.currentData);

        // Create download link
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        // Generate filename
        const timestamp = new Date().toISOString().slice(0, 10);
        const filename = `${this.activeModel.name}_${timestamp}.csv`;

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log(`⚡ Export CSV — ${(performance.now() - start).toFixed(1)}ms — ${filename}`);
      } catch (error) {
        console.error('CSV export error:', error);
        alert('Failed to export CSV: ' + error.message);
      }
    },

    /**
     * Export workflow as JSON file
     */
    exportWorkflowJSON() {
      if (!this.activeModel) {
        alert('No workflow to export');
        return;
      }

      try {
        // Create workflow export object
        const workflow = {
          version: '1.0',
          name: this.activeModel.name,
          exportedAt: new Date().toISOString(),
          source: {
            id: this.sources.find((s) => s.id === this.activeModel.sourceId)?.id,
            name: this.sources.find((s) => s.id === this.activeModel.sourceId)?.name,
            columns: this.sources.find((s) => s.id === this.activeModel.sourceId)?.columns,
          },
          model: {
            id: this.activeModel.id,
            name: this.activeModel.name,
            steps: this.activeModel.steps,
          },
        };

        // Convert to JSON
        const json = JSON.stringify(workflow, null, 2);

        // Create download link
        const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        // Generate filename
        const timestamp = new Date().toISOString().slice(0, 10);
        const filename = `${this.activeModel.name}_workflow_${timestamp}.json`;

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log('Exported workflow JSON:', filename);
      } catch (error) {
        console.error('Workflow export error:', error);
        alert('Failed to export workflow: ' + error.message);
      }
    },

    /**
     * Export current data as JSON file
     */
    exportDataJSON() {
      if (!this.currentData || this.currentData.length === 0) {
        alert('No data to export');
        return;
      }

      const start = performance.now();
      try {
        // Convert current data to JSON
        const json = JSON.stringify(this.currentData, null, 2);

        // Create download link
        const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        // Generate filename
        const timestamp = new Date().toISOString().slice(0, 10);
        const filename = `${this.activeModel.name}_data_${timestamp}.json`;

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        console.log(`⚡ Export JSON — ${(performance.now() - start).toFixed(1)}ms — ${filename}`);
      } catch (error) {
        console.error('JSON export error:', error);
        alert('Failed to export JSON: ' + error.message);
      }
    },

    /**
     * Copy current page data as CSV to clipboard
     */
    async copyCSVToClipboard() {
      const pageData = this.getPaginatedData();
      if (!pageData || pageData.length === 0) {
        alert('No data to copy on this page');
        return;
      }

      try {
        const csv = Papa.unparse(pageData);
        await navigator.clipboard.writeText(csv);
        alert('Current page data copied to clipboard (CSV)!');
      } catch (error) {
        console.error('Copy to clipboard error:', error);
        alert('Failed to copy to clipboard: ' + error.message);
      }
    },

    /**
     * Copy current page data as JSON to clipboard
     */
    async copyJSONToClipboard() {
      const pageData = this.getPaginatedData();
      if (!pageData || pageData.length === 0) {
        alert('No data to copy on this page');
        return;
      }

      try {
        const json = JSON.stringify(pageData, null, 2);
        await navigator.clipboard.writeText(json);
        alert('Current page data copied to clipboard (JSON)!');
      } catch (error) {
        console.error('Copy to clipboard error:', error);
        alert('Failed to copy to clipboard: ' + error.message);
      }
    },
  };
}
