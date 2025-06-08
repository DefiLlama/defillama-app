import * as React from 'react'
import Layout from '~/layout'

function Support() {

	return (
		<Layout title="Support - DefiLlama" defaultSEO>
			<div className="flex flex-col gap-4 w-full max-w-lg mx-auto xl:fixed xl:left-0 xl:right-0 lg:top-4 xl:top-11">
      <form
  method="POST"
  name="fa-form-1"
  action="https://webhook.frontapp.com/forms/0f7e04ca1380d461a597/F-gV64YL71ksNtFfBSteerjcsVT2UusHNyigTYyWlSg_j9Va6r7w3rk7sG7BqL0_RbBV4EFPAITxrs7uaTjThq7V5ZEJEoUfeYI1EWXvjbXD2HOhb3fm0OUHJJVOcOg"
  encType="multipart/form-data"
  accept-charset="utf-8"
>


  <div>
    <label htmlFor="name">Name</label>
    <input type="text" name="name" />
  </div>

  <div>
    <label htmlFor="email">Email</label>
    <input type="email" name="email" />
  </div>

  <div>
    <textarea name="body"></textarea>
  </div>

  <div>
    <input type="file" name="attachment" />
  </div>

   <div id="html_element"></div>
  <div>
    <input type="submit" value="Send" />
  </div></form>
  </div>
		</Layout>
	)
}

export default Support
