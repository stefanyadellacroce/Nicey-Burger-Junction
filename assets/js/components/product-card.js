import { el } from '../core/dom.js';
import { money, notify } from '../core/utils.js';
import {
  productImage
} from '../services/products.js';
import {
  addToCart
} from '../services/cart.js';


/* =========================================================
   PRODUCT CARD
   ========================================================= */

export function productCard(
  product,
  {
    quickAdd = true
  } = {}
) {
  const card = el(
    'article',
    {
      className:
        `product-card ${
          product?.manually_sold_out
            ? 'is-sold-out'
            : ''
        }`
    }
  );


  /* =======================================================
     GLOW
     ======================================================= */

  card.append(
    el('div', {
      className:
        'product-card-glow',
      'aria-hidden':
        'true'
    })
  );


  /* =======================================================
     PRODUCT LINK
     ======================================================= */

  const productUrl =
    `/product.html?slug=${
      encodeURIComponent(
        product?.slug || ''
      )
    }`;


  /* =======================================================
     MEDIA
     ======================================================= */

  const media = el(
    'a',
    {
      href:
        productUrl,

      className:
        'product-media',

      'aria-label':
        `View ${
          product?.name ||
          'product'
        }`
    }
  );


  const imageWrap = el(
    'div',
    {
      className:
        'product-image-wrap'
    }
  );


  const image = el(
    'img',
    {
      src:
        productImage(product),

      alt:
        product?.images?.[0]
          ?.alt_text ||
        product?.name ||
        'Nicey Burger Junction product',

      className:
        'product-image',

      loading:
        'lazy',

      decoding:
        'async',

      width:
        '600',

      height:
        '450'
    }
  );


  image.addEventListener(
    'error',
    () => {
      image.src =
        '/assets/images/food-default.svg';
    },
    {
      once: true
    }
  );


  imageWrap.append(
    image
  );


  media.append(
    imageWrap
  );


  /* =======================================================
     BADGES
     ======================================================= */

  const badgeRow = el(
    'div',
    {
      className:
        'badge-row'
    }
  );


  if (
    product?.bestseller
  ) {
    badgeRow.append(
      el(
        'span',
        {
          className:
            'nbj-badge bestseller'
        },
        [
          el('i', {
            className:
              'bi bi-fire',
            'aria-hidden':
              'true'
          }),

          document.createTextNode(
            ' Best seller'
          )
        ]
      )
    );
  }


  if (
    product?.featured
  ) {
    badgeRow.append(
      el(
        'span',
        {
          className:
            'nbj-badge promo'
        },
        [
          el('i', {
            className:
              'bi bi-star-fill',
            'aria-hidden':
              'true'
          }),

          document.createTextNode(
            ' Featured'
          )
        ]
      )
    );
  }


  if (
    product?.manually_sold_out
  ) {
    badgeRow.append(
      el(
        'span',
        {
          className:
            'nbj-badge warning'
        },
        [
          el('i', {
            className:
              'bi bi-x-circle',
            'aria-hidden':
              'true'
          }),

          document.createTextNode(
            ' Sold out'
          )
        ]
      )
    );
  }


  if (
    badgeRow.childElementCount
  ) {
    media.append(
      badgeRow
    );
  }


  /* =======================================================
     BODY
     ======================================================= */

  const body = el(
    'div',
    {
      className:
        'product-body product-card-content'
    }
  );


  const categoryName =
    product?.category?.name ||
    product?.categories?.name ||
    'Nicey';


  body.append(
    el(
      'div',
      {
        className:
          'product-category',
        text:
          categoryName
      }
    )
  );


  body.append(
    el(
      'a',
      {
        href:
          productUrl,

        className:
          'product-title text-decoration-none',

        text:
          product?.name ||
          'Nicey Product'
      }
    )
  );


  const description =
    product?.short_description ||
    product?.description ||
    'Freshly prepared by Nicey Burger Junction.';


  body.append(
    el(
      'p',
      {
        className:
          'product-desc',

        text:
          description
      }
    )
  );


  /* =======================================================
     META
     ======================================================= */

  const meta = el(
    'div',
    {
      className:
        'product-meta'
    }
  );


  if (
    product?.prep_time_minutes
  ) {
    meta.append(
      el(
        'span',
        {
          className:
            'product-meta-item'
        },
        [
          el('i', {
            className:
              'bi bi-clock',
            'aria-hidden':
              'true'
          }),

          document.createTextNode(
            `${product.prep_time_minutes} min`
          )
        ]
      )
    );
  }


  if (
    product?.bestseller
  ) {
    meta.append(
      el(
        'span',
        {
          className:
            'product-meta-item'
        },
        [
          el('i', {
            className:
              'bi bi-heart-fill',
            'aria-hidden':
              'true'
          }),

          document.createTextNode(
            ' Popular'
          )
        ]
      )
    );
  }


  if (
    meta.childElementCount
  ) {
    body.append(
      meta
    );
  }


  /* =======================================================
     FOOTER
     ======================================================= */

  const footer = el(
    'div',
    {
      className:
        'product-footer'
    }
  );


  const priceWrap = el(
    'div',
    {
      className:
        'product-price-wrap'
    }
  );


  /* =======================================================
     PRICE
     ======================================================= */

  const basePrice =
    Number(
      product?.base_price ||
      product?.price ||
      0
    );


  priceWrap.append(
    el(
      'span',
      {
        className:
          'price',

        text:
          money(basePrice)
      }
    )
  );


  /*
   * Optional original / old price.
   */

  const comparePrice =
    Number(
      product?.compare_at_price ||
      product?.old_price ||
      0
    );


  if (
    comparePrice >
    basePrice
  ) {
    priceWrap.append(
      el(
        'span',
        {
          className:
            'old-price',

          text:
            money(
              comparePrice
            )
        }
      )
    );
  }


  footer.append(
    priceWrap
  );


  /* =======================================================
     QUICK ADD / CUSTOMIZE
     ======================================================= */

  if (
    quickAdd
  ) {
    const hasVariants =
      Array.isArray(
        product?.variants
      ) &&
      product.variants.length > 0;


    const hasAddons =
      Array.isArray(
        product?.product_addons
      ) &&
      product.product_addons.length > 0;


    const hasOptions =
      hasVariants ||
      hasAddons;


    const soldOut =
      Boolean(
        product
          ?.manually_sold_out
      );


    const button = el(
      'button',
      {
        type:
          'button',

        className:
          'btn-nbj sm product-add-btn',

        disabled:
          soldOut,

        'aria-label':
          soldOut
            ? `${product?.name || 'Product'} is sold out`
            : hasOptions
              ? `Customize ${product?.name || 'product'}`
              : `Add ${product?.name || 'product'} to cart`
      },
      [
        el('i', {
          className:
            soldOut
              ? 'bi bi-x-circle'
              : hasOptions
                ? 'bi bi-sliders'
                : 'bi bi-bag-plus',

          'aria-hidden':
            'true'
        }),

        el('span', {
          text:
            soldOut
              ? 'Sold out'
              : hasOptions
                ? 'Customize'
                : 'Add'
        })
      ]
    );


    button.addEventListener(
      'click',
      async event => {
        event.preventDefault();
        event.stopPropagation();


        if (
          soldOut
        ) {
          return;
        }


        /*
         * Products with variants/add-ons
         * should go to product details.
         */

        if (
          hasOptions
        ) {
          location.href =
            productUrl;

          return;
        }


        button.disabled =
          true;


        button.setAttribute(
          'aria-busy',
          'true'
        );


        try {
          await addToCart({
            product_id:
              product.id,

            quantity:
              1
          });


          button.classList.add(
            'is-added'
          );


          const icon =
            button.querySelector(
              'i'
            );


          const label =
            button.querySelector(
              'span'
            );


          if (
            icon
          ) {
            icon.className =
              'bi bi-check-lg';
          }


          if (
            label
          ) {
            label.textContent =
              'Added';
          }


          notify(
            `${
              product?.name ||
              'Item'
            } added to cart.`,
            'success'
          );


          /*
           * Notify header/cart listeners if
           * your project uses custom events.
           */

          window.dispatchEvent(
            new CustomEvent(
              'cart:updated'
            )
          );


          window.setTimeout(
            () => {
              button.classList.remove(
                'is-added'
              );


              if (
                icon
              ) {
                icon.className =
                  'bi bi-bag-plus';
              }


              if (
                label
              ) {
                label.textContent =
                  'Add';
              }
            },
            1400
          );

        } catch (
          error
        ) {
          console.error(
            'Unable to add product to cart:',
            error
          );


          notify(
            error?.message ||
            'Unable to add this item to your cart.',
            'danger'
          );

        } finally {
          button.disabled =
            false;


          button.removeAttribute(
            'aria-busy'
          );
        }
      }
    );


    footer.append(
      button
    );
  }


  body.append(
    footer
  );


  /* =======================================================
     COMPLETE CARD
     ======================================================= */

  card.append(
    media,
    body
  );


  return card;
}


/* =========================================================
   DEFAULT EXPORT
   Supports BOTH:
   import productCard from '...'
   and
   import { productCard } from '...'
   ========================================================= */

export default productCard;