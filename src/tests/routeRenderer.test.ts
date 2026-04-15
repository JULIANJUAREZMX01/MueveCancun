import { describe, it, expect } from 'vitest';
import { renderBestResultHtml, renderTransferCardHtml } from '../utils/routeRenderer';

const mockUi = {
    'calc.best': '¡MEJOR!',
    'calc.results.map': 'VER MAPA',
    'calc.transfer': 'TRANSBORDO',
    'calc.results.transfer_at': 'Cambio en',
    'calc.view_route': 'VER RUTA'
};

describe('renderBestResultHtml', () => {
    const standardJourney = {
        total_price: 12.50,
        legs: [{
            name: 'Ruta 1',
            transport_type: 'Bus',
            operator: 'Autocar',
            frequency: '10 min',
            duration: '30 min',
            origin_hub: 'Centro',
            dest_hub: 'Playa',
            badges: ['AC', 'WiFi'],
            stops: []
        }]
    };

    it('should render standard route details correctly', () => {
        const html = renderBestResultHtml(standardJourney, false, mockUi);

        expect(html).toContain('Ruta 1');
        expect(html).toContain('$12.50');
        expect(html).toContain('Autobús'); // Label for 'Bus'
        expect(html).toContain('Centro → Playa');
        expect(html).toContain('c-route-result');
    });

    it('should render BEST badge and specific styling when isBest is true', () => {
        const html = renderBestResultHtml(standardJourney, true, mockUi);

        expect(html).toContain('c-route-result--on-map');
    });

    it('should render badges and escape them', () => {
        const journeyWithUnsafeBadge = {
            ...standardJourney,
            legs: [{
                ...standardJourney.legs[0],
                badges: ['<script>alert("xss")</script>']
            }]
        };
        const html = renderBestResultHtml(journeyWithUnsafeBadge, false, mockUi);

        expect(html).toContain('c-badge--caribbean');
        expect(html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
        expect(html).not.toContain('<script>');
    });

    it('should use stop names in preview when stops are present', () => {
        const journeyWithStops = {
            ...standardJourney,
            legs: [{
                ...standardJourney.legs[0],
                stops: [
                    { name: 'Parada A' },
                    { name: 'Parada B' },
                    { name: 'Parada C' }
                ]
            }]
        };
        const html = renderBestResultHtml(journeyWithStops, false, mockUi);

        expect(html).toContain('Parada A → Parada C');
        expect(html).not.toContain('Centro → Playa');
    });

    it('should escape all dynamic fields to prevent XSS', () => {
        const unsafeJourney = {
            total_price: 0,
            legs: [{
                name: '<b>Unsafe Name</b>',
                operator: '<i>Unsafe Op</i>',
                duration: '<u>Unsafe Dur</u>',
                origin_hub: '<marquee>Hub 1</marquee>',
                dest_hub: '<blink>Hub 2</blink>',
                transport_type: 'Bus',
                stops: []
            }]
        };
        const html = renderBestResultHtml(unsafeJourney, false, mockUi);

        expect(html).toContain('&lt;b&gt;Unsafe Name&lt;/b&gt;');
        expect(html).toContain('&lt;marquee&gt;Hub 1&lt;/marquee&gt; → &lt;blink&gt;Hub 2&lt;/blink&gt;');

        expect(html).not.toContain('<b>');
        expect(html).not.toContain('<marquee>');
    });
});

describe('renderTransferCardHtml', () => {
    const transferJourney = {
        total_price: 25.00,
        transfer_point: 'Terminal Central',
        legs: [
            {
                name: 'Ruta 1',
                transport_type: 'Bus',
                origin_hub: 'A',
                dest_hub: 'Terminal Central'
            },
            {
                name: 'Ruta 2',
                transport_type: 'Combi',
                origin_hub: 'Terminal Central',
                dest_hub: 'B'
            }
        ]
    };

    it('should render transfer journey details correctly', () => {
        const html = renderTransferCardHtml(transferJourney, false, mockUi);

        expect(html).toContain('Ruta 1');
        expect(html).toContain('Ruta 2');
        expect(html).toContain('Cambio en: Terminal Central');
        expect(html).toContain('$25.00');
        expect(html).toContain('TRANSBORDO');
    });

    it('should render BEST badge when isBest is true', () => {
        const html = renderTransferCardHtml(transferJourney, true, mockUi);

        expect(html).toContain('c-route-result--on-map');
    });

    it('should escape all dynamic fields to prevent XSS', () => {
        const unsafeTransfer = {
            total_price: 0,
            transfer_point: '<script>alert("point")</script>',
            legs: [
                {
                    name: '<b>Leg 1</b>',
                    transport_type: 'Bus'
                },
                {
                    name: '<i>Leg 2</i>',
                    transport_type: 'Combi'
                }
            ]
        };
        const html = renderTransferCardHtml(unsafeTransfer, false, mockUi);

        expect(html).toContain('&lt;script&gt;alert(&quot;point&quot;)&lt;/script&gt;');
        expect(html).toContain('&lt;b&gt;Leg 1&lt;/b&gt;');

        expect(html).not.toContain('<script>');
        expect(html).not.toContain('<b>');
    });
});
