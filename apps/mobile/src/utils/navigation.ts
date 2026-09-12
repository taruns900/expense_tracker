type NavigationLike = {
  canGoBack: () => boolean;
  back: () => void;
  replace: (href: '/') => void;
};

export function safeGoBack(router: NavigationLike) {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace('/');
}
