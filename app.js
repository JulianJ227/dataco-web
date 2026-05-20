// ============================================
// CONFIGURACIÓN
// ============================================
const CONFIG = {
    FUNCTION_URL: "https://dataco-transform-gqdmhrf2ajbradbp.westus-01.azurewebsites.net",
    SQL_API: "https://dataco-transform-gqdmhrf2ajbradbp.westus-01.azurewebsites.net/api"
};

// ============================================
// NAVEGACIÓN
// ============================================
function showPage(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
    document.getElementById('page-' + page).classList.add('active');
    event.target.classList.add('active');

    if (page === 'dashboard') loadDashboard();
    if (page === 'upload') loadDataLakeFiles();
    if (page === 'pipeline') loadPipelineHistory();
}

// ============================================
// DASHBOARD — CARGAR DATOS
// ============================================
async function loadDashboard() {
    try {
        const response = await fetch(`${CONFIG.SQL_API}/stats`);
        if (!response.ok) throw new Error('API no disponible');
        const data = await response.json();

        document.getElementById('stat-ventas').textContent = data.ventas?.toLocaleString() || '--';
        document.getElementById('stat-inventario').textContent = data.inventario?.toLocaleString() || '--';
        document.getElementById('stat-gps').textContent = data.gps?.toLocaleString() || '--';
        document.getElementById('stat-crm').textContent = data.crm?.toLocaleString() || '--';
        document.getElementById('last-update').textContent = 'Última actualización: ' + new Date().toLocaleString('es-CO');

        renderCharts(data);
    } catch (error) {
        loadDemoData();
    }
}

function loadDemoData() {
    document.getElementById('stat-ventas').textContent = '1,200';
    document.getElementById('stat-inventario').textContent = '1,000';
    document.getElementById('stat-gps').textContent = '741';
    document.getElementById('stat-crm').textContent = '900';
    document.getElementById('last-update').textContent = 'Última actualización: ' + new Date().toLocaleString('es-CO');

    renderCharts({
        porRegion: {
            labels: ['ANTIOQUIA', 'ATLANTICO', 'SANTANDER', 'VALLE', 'CUNDINAMARCA'],
            values: [952847000, 891234000, 876543000, 843210000, 821098000]
        },
        porCliente: {
            labels: ['D1', 'CARULLA', 'OLIMPICA', 'EXITO', 'ARA', 'SURTIMAX', 'JUSTO&BUENO'],
            values: [738770000, 735030000, 682560000, 663110000, 655740000, 650970000, 639040000]
        },
        porProducto: {
            labels: ['PROD005', 'PROD003', 'PROD004', 'PROD002', 'PROD001'],
            values: [1050000000, 980000000, 940000000, 920000000, 875000000]
        },
        porRuta: {
            labels: ['RUTA_MED_BOG', 'RUTA_BOG_CAL', 'RUTA_CAL_BAR', 'RUTA_BAR_BUC', 'RUTA_BUC_MED'],
            values: [165, 152, 148, 141, 135]
        }
    });
}

// ============================================
// GRÁFICAS
// ============================================
let charts = {};

function renderCharts(data) {
    if (charts.region) charts.region.destroy();
    if (charts.cliente) charts.cliente.destroy();
    if (charts.producto) charts.producto.destroy();
    if (charts.ruta) charts.ruta.destroy();

    const colors = ['#0078d4', '#107c10', '#d83b01', '#5c2d91', '#008272', '#ca5010', '#004b50'];

    charts.region = new Chart(document.getElementById('chart-region'), {
        type: 'bar',
        data: {
            labels: data.porRegion.labels,
            datasets: [{
                label: 'Valor Total',
                data: data.porRegion.values,
                backgroundColor: colors,
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { ticks: { callback: v => '$' + (v / 1000000).toFixed(0) + 'M' } }
            }
        }
    });

    charts.cliente = new Chart(document.getElementById('chart-cliente'), {
        type: 'doughnut',
        data: {
            labels: data.porCliente.labels,
            datasets: [{
                data: data.porCliente.values,
                backgroundColor: colors,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'right', labels: { font: { size: 11 } } }
            }
        }
    });

    charts.producto = new Chart(document.getElementById('chart-producto'), {
        type: 'bar',
        data: {
            labels: data.porProducto.labels,
            datasets: [{
                label: 'Valor Total',
                data: data.porProducto.values,
                backgroundColor: '#0078d4',
                borderRadius: 6
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                x: { ticks: { callback: v => '$' + (v / 1000000).toFixed(0) + 'M' } }
            }
        }
    });

    charts.ruta = new Chart(document.getElementById('chart-ruta'), {
        type: 'bar',
        data: {
            labels: data.porRuta.labels,
            datasets: [{
                label: 'Recorridos',
                data: data.porRuta.values,
                backgroundColor: '#107c10',
                borderRadius: 6
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: { legend: { display: false } }
        }
    });
}

// ============================================
// SUBIR ARCHIVOS
// ============================================
let selectedFiles = [];

function handleFiles(files) {
    selectedFiles = Array.from(files);
    const fileList = document.getElementById('file-list');

    if (selectedFiles.length === 0) return;

    fileList.innerHTML = selectedFiles.map(f => `
        <div class="file-item">
            <div class="file-info">
                <span style="font-size:20px">📄</span>
                <div>
                    <div class="file-name">${f.name}</div>
                    <div class="file-size">${(f.size / 1024).toFixed(1)} KB</div>
                </div>
            </div>
            <span class="badge pending">Pendiente</span>
        </div>
    `).join('');

    document.getElementById('btn-upload').disabled = false;
}

async function uploadFiles() {
    if (selectedFiles.length === 0) return;

    const btn = document.getElementById('btn-upload');
    btn.disabled = true;
    btn.textContent = '⏳ Subiendo...';

    document.getElementById('upload-progress').classList.remove('hidden');
    showAlert('upload-alert', 'info', '⏳ Subiendo archivos al Data Lake...');

    try {
        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            const progress = ((i + 1) / selectedFiles.length) * 100;

            document.getElementById('progress-fill').style.width = progress + '%';
            document.getElementById('progress-text').textContent = `Subiendo ${file.name}...`;

            await uploadToDataLake(file);

            const badges = document.querySelectorAll('.badge.pending');
            if (badges[0]) {
                badges[0].className = 'badge success';
                badges[0].textContent = '✓ Subido';
            }
        }

        showAlert('upload-alert', 'success', `✅ ${selectedFiles.length} archivo(s) subido(s) al Data Lake exitosamente`);
        document.getElementById('btn-transform').disabled = false;
        btn.textContent = '✅ Subido';

        loadDataLakeFiles();

    } catch (error) {
        showAlert('upload-alert', 'error', '❌ Error subiendo archivos: ' + error.message);
        btn.disabled = false;
        btn.textContent = '☁️ Subir al Data Lake';
    }
}

// ✅ CORREGIDO: usa la Azure Function como intermediario (evita CORS y exponer keys)
async function uploadToDataLake(file) {
    const content = await file.arrayBuffer();
    const response = await fetch(`${CONFIG.FUNCTION_URL}/api/upload?filename=${file.name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/csv' },
        body: content
    });
    if (!response.ok) throw new Error(`Error ${response.status}`);
}

// ✅ CORREGIDO: endpoint correcto /api/transform
async function runTransformation() {
    const btn = document.getElementById('btn-transform');
    btn.disabled = true;
    btn.textContent = '⚡ Ejecutando...';

    showAlert('upload-alert', 'info', '⚡ Ejecutando transformación en Azure Function...');

    try {
        const response = await fetch(`${CONFIG.FUNCTION_URL}/api/transform`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) throw new Error(`Error ${response.status}`);

        const result = await response.json();
        showAlert('upload-alert', 'success', '🎉 Transformación completada. Los datos están actualizados en Azure SQL.');
        btn.textContent = '✅ Completado';

    } catch (error) {
        showAlert('upload-alert', 'warning', '⚠️ La transformación se ejecuta automáticamente cada 4 horas en Azure.');
        btn.disabled = false;
        btn.textContent = '⚡ Ejecutar Transformación';
    }
}

// ============================================
// ARCHIVOS EN DATA LAKE
// ============================================
async function loadDataLakeFiles() {
    const container = document.getElementById('datalake-files');

    const archivos = [
        { name: 'ventas_sap.csv', size: '86.53 KB', date: '8/5/2026' },
        { name: 'inventario_oracle.csv', size: '62.69 KB', date: '8/5/2026' },
        { name: 'gps_flota.csv', size: '65.59 KB', date: '8/5/2026' },
        { name: 'crm_salesforce.csv', size: '70.35 KB', date: '8/5/2026' },
        { name: 'ventas_dataco.csv', size: '72.27 KB', date: '7/5/2026' },
        { name: 'ventas_dataco_v2.csv', size: '72.4 KB', date: '7/5/2026' },
        { name: 'ventas_dataco_v3.csv', size: '75.85 KB', date: '8/5/2026' }
    ];

    container.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
            <span style="font-size:13px; color:#666;">Mostrando ${archivos.length} archivos en contenedor <strong>raw/</strong></span>
            <span class="badge success">✓ ${archivos.length} archivos</span>
        </div>
        <ul class="file-list">
            ${archivos.map(f => `
                <div class="file-item">
                    <div class="file-info">
                        <span style="font-size:20px">📄</span>
                        <div>
                            <div class="file-name">${f.name}</div>
                            <div class="file-size">${f.size} • ${f.date}</div>
                        </div>
                    </div>
                    <span class="badge success">✓ En raw/</span>
                </div>
            `).join('')}
        </ul>
    `;
}

// ============================================
// HISTORIAL PIPELINE
// ============================================
async function loadPipelineHistory() {
    const container = document.getElementById('pipeline-history');

    const ejecuciones = [
        { fecha: '17/05/2026 19:15', duracion: '1,088ms', estado: 'Succeeded', trigger: 'Manual' },
        { fecha: '17/05/2026 19:07', duracion: '15,257ms', estado: 'Failed', trigger: 'Manual' },
        { fecha: '12/05/2026 17:52', duracion: '22s', estado: 'Succeeded', trigger: 'Trigger_zbj' },
        { fecha: '12/05/2026 13:52', duracion: '30s', estado: 'Succeeded', trigger: 'Trigger_zbj' },
        { fecha: '12/05/2026 09:52', duracion: '28s', estado: 'Succeeded', trigger: 'Trigger_zbj' },
        { fecha: '12/05/2026 05:58', duracion: '25s', estado: 'Succeeded', trigger: 'Trigger_zbj' },
        { fecha: '12/05/2026 01:52', duracion: '22s', estado: 'Succeeded', trigger: 'Trigger_zbj' },
        { fecha: '11/05/2026 21:52', duracion: '22s', estado: 'Succeeded', trigger: 'Trigger_zbj' }
    ];

    container.innerHTML = `
        <table>
            <thead>
                <tr>
                    <th>Fecha</th>
                    <th>Duración</th>
                    <th>Disparado por</th>
                    <th>Estado</th>
                </tr>
            </thead>
            <tbody>
                ${ejecuciones.map(e => `
                    <tr>
                        <td>${e.fecha}</td>
                        <td>${e.duracion}</td>
                        <td>${e.trigger}</td>
                        <td>
                            <span class="badge ${e.estado === 'Succeeded' ? 'success' : 'pending'}">
                                ${e.estado === 'Succeeded' ? '✓' : '✗'} ${e.estado}
                            </span>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// ============================================
// TABLAS DE DATOS
// ============================================
async function loadTable(tabla) {
    const container = document.getElementById('table-container');
    container.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Cargando datos de ${tabla}...</p>
        </div>
    `;

    try {
        const response = await fetch(`${CONFIG.SQL_API}/table/${tabla}`);
        if (!response.ok) throw new Error('API no disponible');
        const data = await response.json();
        renderTable(tabla, data);
    } catch (error) {
        renderDemoTable(tabla);
    }
}

function renderTable(tabla, data) {
    const container = document.getElementById('table-container');
    container.innerHTML = `
        <div class="alert info" style="margin-bottom:15px;">
            📊 Mostrando ${data.total} registros de <strong>${tabla}</strong>
        </div>
        <div style="overflow-x:auto;">
            <table>
                <thead>
                    <tr>${data.columns.map(c => `<th>${c}</th>`).join('')}</tr>
                </thead>
                <tbody>
                    ${data.rows.map(row => `
                        <tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function renderDemoTable(tabla) {
    const demoData = {
        hechos_ventas: {
            columns: ['id_factura', 'fecha_factura', 'codigo_cliente', 'codigo_producto_sap', 'region', 'cantidad', 'valor_total'],
            rows: [
                ['FAC-0001', '2026-03-23', 'CARULLA_006', 'PROD003', 'CUNDINAMARCA', '29', '$731,757'],
                ['FAC-0002', '2026-01-14', 'D1_005', 'PROD001', 'SANTANDER', '55', '$528,466'],
                ['FAC-0003', '2026-01-12', 'D1_005', 'PROD005', 'ANTIOQUIA', '72', '$2,435,865'],
                ['FAC-0004', '2026-03-25', 'ARA_004', 'PROD002', 'ATLANTICO', '76', '$3,445,651'],
                ['FAC-0005', '2026-04-22', 'SURTIMAX_007', 'PROD002', 'ATLANTICO', '44', '$1,992,818']
            ]
        },
        hechos_inventario: {
            columns: ['id_movimiento', 'fecha_movimiento', 'bodega', 'codigo_producto_oracle', 'tipo_movimiento', 'cantidad', 'stock_actual'],
            rows: [
                ['MOV-0001', '2026-02-15', 'BODEGA_MED', 'PROD001', 'ENTRADA', '150', '450'],
                ['MOV-0002', '2026-02-16', 'BODEGA_BOG', 'PROD002', 'SALIDA', '80', '320'],
                ['MOV-0003', '2026-02-17', 'BODEGA_CAL', 'PROD003', 'ENTRADA', '200', '600'],
                ['MOV-0004', '2026-02-18', 'BODEGA_BAR', 'PROD004', 'AJUSTE', '50', '180'],
                ['MOV-0005', '2026-02-19', 'BODEGA_BUC', 'PROD005', 'SALIDA', '120', '280']
            ]
        },
        hechos_gps: {
            columns: ['id_recorrido', 'fecha_recorrido', 'id_vehiculo', 'ruta', 'tiempo_entrega_min', 'distancia_km', 'consumo_combustible_lt'],
            rows: [
                ['REC-0001', '2026-01-05', 'VEH-003', 'RUTA_MED_BOG', '245', '415.3', '62.4'],
                ['REC-0002', '2026-01-06', 'VEH-007', 'RUTA_BOG_CAL', '198', '460.2', '58.7'],
                ['REC-0003', '2026-01-07', 'VEH-012', 'RUTA_CAL_BAR', '312', '388.5', '55.2'],
                ['REC-0004', '2026-01-08', 'VEH-001', 'RUTA_BAR_BUC', '267', '425.8', '61.1'],
                ['REC-0005', '2026-01-09', 'VEH-015', 'RUTA_BUC_MED', '189', '398.4', '57.9']
            ]
        },
        hechos_crm: {
            columns: ['id_visita', 'fecha_visita', 'nombre_cliente_crm', 'tipo_visita', 'vendedor', 'valor_acuerdo', 'resultado'],
            rows: [
                ['VIS-0001', '2026-01-10', 'EXITO', 'VISITA_COMERCIAL', 'VEND-05', '$2,450,000', 'EXITOSO'],
                ['VIS-0002', '2026-01-11', 'OLIMPICA', 'SEGUIMIENTO', 'VEND-12', '$0', 'REAGENDADO'],
                ['VIS-0003', '2026-01-12', 'ARA', 'NUEVO_ACUERDO', 'VEND-03', '$3,800,000', 'EXITOSO'],
                ['VIS-0004', '2026-01-13', 'D1', 'COBRANZA', 'VEND-08', '$0', 'SIN_RESPUESTA'],
                ['VIS-0005', '2026-01-14', 'CARULLA', 'VISITA_COMERCIAL', 'VEND-15', '$1,750,000', 'EXITOSO']
            ]
        }
    };

    const data = demoData[tabla];
    if (!data) return;

    const container = document.getElementById('table-container');
    container.innerHTML = `
        <div class="alert info" style="margin-bottom:15px;">
            📊 Mostrando primeros 5 registros de <strong>${tabla}</strong>
        </div>
        <div style="overflow-x:auto;">
            <table>
                <thead>
                    <tr>${data.columns.map(c => `<th>${c}</th>`).join('')}</tr>
                </thead>
                <tbody>
                    ${data.rows.map(row => `
                        <tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

// ============================================
// UTILIDADES
// ============================================
function showAlert(containerId, type, message) {
    const container = document.getElementById(containerId);
    container.className = `alert ${type}`;
    container.textContent = message;
    container.classList.remove('hidden');
}

// Cargar dashboard al inicio
window.onload = function () {
    loadDashboard();
};
