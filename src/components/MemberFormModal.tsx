import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import type { MemberInput } from '../api'
import { useModal } from './useModal'

interface MemberFormModalProps {
  onSave: (values: MemberInput) => Promise<void>
  onClose: () => void
}

function MemberFormModal({ onSave, onClose }: MemberFormModalProps) {
  const dialogRef = useModal(onClose)
  const [values, setValues] = useState<MemberInput>({ name: '', email: '', phone_num: '', password: '', role: 'member' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (field: keyof MemberInput) => (event: { target: { value: string } }) =>
    setValues((current) => ({ ...current, [field]: event.target.value }))

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave(values)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not register this member')
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="modal modal-form member-form-modal" role="dialog" aria-modal="true" aria-labelledby="member-form-title" ref={dialogRef}>
        <button className="icon-button modal-close" aria-label="Close form" onClick={onClose}><X size={18} /></button>
        <h2 id="member-form-title">Create a library account</h2>
        <p className="modal-subtitle">Create a member or librarian account. They can sign in with these credentials right away.</p>
        <form className="member-form" onSubmit={(event) => void submit(event)}>
          <div className="book-form-fields">
            <fieldset className="account-type-field">
              <legend>Account type</legend>
              <div className="account-type-control" role="radiogroup" aria-label="Account type">
                <label className={`account-type-option ${values.role === 'member' ? 'account-type-option-selected' : ''}`}>
                  <input type="radio" name="member-role" value="member" checked={values.role === 'member'} onChange={() => setValues((current) => ({ ...current, role: 'member' }))} />
                  <span>General member</span>
                </label>
                <label className={`account-type-option ${values.role === 'librarian' ? 'account-type-option-selected' : ''}`}>
                  <input type="radio" name="member-role" value="librarian" checked={values.role === 'librarian'} onChange={() => setValues((current) => ({ ...current, role: 'librarian' }))} />
                  <span>Librarian</span>
                </label>
              </div>
            </fieldset>

            <label htmlFor="member-name">Full name</label>
            <input id="member-name" value={values.name} onChange={set('name')} autoComplete="name" required maxLength={100} data-autofocus />

            <label htmlFor="member-email">Email address</label>
            <input id="member-email" type="email" value={values.email} onChange={set('email')} autoComplete="email" required maxLength={254} />

            <label htmlFor="member-phone">Phone number{values.role === 'librarian' ? ' (optional)' : ''}</label>
            <input id="member-phone" type="tel" value={values.phone_num} onChange={set('phone_num')} autoComplete="tel" required={values.role === 'member'} maxLength={40} />

            <label htmlFor="member-password">Temporary password</label>
            <input id="member-password" type="password" value={values.password} onChange={set('password')} autoComplete="new-password" minLength={8} maxLength={72} required />
          </div>
          <p className="member-form-note">The account can sign in immediately. Share the initial password securely with the person.</p>
          {error && <p className="auth-error book-form-error" role="alert">{error}</p>}
          <div className="modal-actions book-form-actions">
            <button className="button button-primary" type="submit" disabled={saving}>{saving ? 'Creating account…' : 'Create account'}</button>
            <button className="button button-secondary" type="button" onClick={onClose} disabled={saving}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default MemberFormModal