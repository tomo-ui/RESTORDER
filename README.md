# RESTORDER

PWA do zamówień u dostawców restauracji: ilości osobno dla każdego dostawcy i gotowy SMS.
Bez backendu – wszystkie dane zapisują się lokalnie w telefonie (localStorage).

## Wdrożenie na GitHub Pages
1. Wypchnij repo na GitHub.
2. Settings → Pages → Source: „Deploy from a branch”, branch `main`, folder `/ (root)`.
3. Otwórz adres `https://<user>.github.io/<repo>/` na telefonie.

## Instalacja na telefonie (pełny ekran)
- **iPhone:** Safari → Udostępnij → „Dodaj do ekranu początkowego”.
- **Android:** Chrome → menu ⋮ → „Zainstaluj aplikację” (po zmianie manifestu odinstaluj starą wersję i zainstaluj ponownie).

## Uruchomienie lokalne
`python -m http.server 8765` w tym folderze → http://localhost:8765
